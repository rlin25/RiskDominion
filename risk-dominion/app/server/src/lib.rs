//! Risk: Dominion — SpacetimeDB server module.
//!
//! Single-file module organized by section. Reducers are deterministic and
//! return `Result<(), String>` (clients observe outcomes via subscriptions, not
//! return values). All external/LLM work happens in *procedures* — the only
//! function type allowed to make HTTP calls (`ctx.http`); reducers never do.
//!
//! Slice 2: adds 3 AI opponents, the Covert dimension, the intel system, and the
//! AI reasoning cycle (a scheduled procedure that calls Claude via `ctx.http`).

use spacetimedb::{
    ProcedureContext, ReducerContext, ScheduleAt, SpacetimeType, Table, TimeDuration,
};

// ---- CONSTANTS ----

const MAX_ACTION_POINTS: i32 = 10;
const ACTION_REGEN_SECONDS: u64 = 1;
const STARTING_ACTION_POINTS: i32 = 5;
const ECONOMIC_INVEST_AMOUNT: i32 = 5;
const WIN_UNIFIED_TERRITORIES: i32 = 5; // unify across all 4 dimensions (Slice 3+)
const TOTAL_TERRITORIES: i32 = 12;
const TOTAL_PLAYERS: i32 = 4;
const MIN_TROOPS: i32 = 1;

const CULTURAL_TICK_SECONDS: u64 = 30;
const INFLUENCE_FLIP_THRESHOLD: i32 = 50;
const CULTURAL_PRESSURE_DIVISOR: i32 = 10;

const AI_CYCLE_SECONDS: u64 = 60;
const AI_STAGGER_SECONDS: u64 = 20;
const AI_LLM_TIMEOUT_SECONDS: u64 = 30;
const AI_MAX_TOKENS: u32 = 1500;
const SPECIALIST_LLM_TIMEOUT_SECONDS: u64 = 15;
const STRATEGIST_CYCLE_SECONDS: u64 = 60;
const STRATEGIST_OFFSET_SECONDS: u64 = 50;
const STRATEGIST_MAX_TOKENS: u32 = 300;
const STRATEGIST_TIMEOUT_SECONDS: u64 = 15;
const INTEL_THRESHOLD: i32 = 3;

const MAX_CHAT_MESSAGE_LENGTH: usize = 500;
const TRUST_INITIAL: i32 = 50;
const TRUST_VERIFIED_BONUS: i32 = 3;
const TRUST_LIE_PENALTY: i32 = 15;
const TRUST_DECAY_PER_CYCLE: i32 = 1;
const TRUST_DECAY_FLOOR: i32 = 25;
const CHAT_RATE_LIMIT_PER_CYCLE: usize = 3;

const ANTHROPIC_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const DEFAULT_MODEL: &str = "claude-sonnet-4-6";

// ---- TABLES ----

#[spacetimedb::table(accessor = military, public)]
pub struct Military {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    pub troop_count: i32,
}

#[spacetimedb::table(accessor = economic, public)]
pub struct Economic {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    pub capital: i32,
}

#[spacetimedb::table(accessor = covert, public)]
pub struct Covert {
    #[primary_key]
    pub territory_id: i32,
    /// 0 means no agents present (no Covert owner).
    pub owner_id: i32,
    pub agent_count: i32,
}

#[spacetimedb::table(accessor = cultural, public)]
pub struct Cultural {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    /// Accumulated foreign influence, 0-100. Flips ownership above 50.
    pub influence_pct: i32,
}

/// Narrative event log. Reducers append a row as the last operation of a
/// state-changing transaction (atomic with the action); the client renders a
/// scrolling ticker. Never written by clients, never read for game logic.
#[spacetimedb::table(accessor = event_feed, public)]
pub struct EventFeed {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub event_at: i64,
    pub event_text: String,
    pub territory_id: Option<i32>,
    pub player_id: Option<i32>,
    /// One of: military, economic, cultural, covert, victory, system.
    pub event_type: String,
}

#[spacetimedb::table(accessor = players, public)]
pub struct Player {
    #[primary_key]
    pub player_id: i32,
    pub player_name: String,
    pub color: String,
    pub action_points: i32,
    pub last_regen_at: i64,
    pub is_ai: bool,
}

#[spacetimedb::table(accessor = game_state, public)]
pub struct GameState {
    #[primary_key]
    pub key: String,
    pub value: String,
}

#[spacetimedb::table(accessor = ai_state, public)]
pub struct AiState {
    #[primary_key]
    pub ai_player_id: i32,
    pub cycle_status: String, // "idle" | "pending"
    pub last_cycle_at: i64,   // 0 if never
    pub next_cycle_at: i64,
}

#[spacetimedb::table(accessor = ai_reasoning_log, public)]
pub struct AiReasoningLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub ai_player_id: i32,
    pub cycle_at: i64,
    pub reasoning_text: String,
    pub actions_taken: String, // JSON array
    /// Which agent produced this row: a specialist id, or "commander".
    pub subordinate_id: String,
}

/// Public chat. Privacy is structural: secret fields live in `chat_secret`
/// (non-public), and DM scoping is a client subscription row filter.
#[spacetimedb::table(accessor = chat_log, public)]
pub struct ChatLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub timestamp: i64,
    pub sender_id: i32,
    pub recipient_id: i32, // 0 = global, 1-4 = DM
    pub message_text: String,
    pub territory_id: i32, // 0 = none
}

/// Secret companion to `chat_log`. NOT public: no client subscription, no client
/// binding. Only server-side logic (AI cycle, Strategist) reads it.
#[spacetimedb::table(accessor = chat_secret)]
pub struct ChatSecret {
    #[primary_key]
    pub chat_id: u64,
    pub is_deception: bool,
    pub claimed_fact: String,
}

/// Per-AI trust toward each other player. No native composite PK, so use a
/// surrogate id + a btree index on (ai_player_id, target_player_id).
#[spacetimedb::table(
    accessor = ai_trust,
    public,
    index(accessor = by_pair, btree(columns = [ai_player_id, target_player_id]))
)]
pub struct AiTrust {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub ai_player_id: i32,
    pub target_player_id: i32,
    pub trust_score: i32,
    pub messages_evaluated: i32,
    pub truths_confirmed: i32,
    pub lies_caught: i32,
    pub last_updated: i64,
}

/// Advisor notifications for the human player (Slice 5). Public so the client
/// can subscribe; written by the strategist_cycle procedure.
#[spacetimedb::table(accessor = strategist_log, public)]
pub struct StrategistLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub created_at: i64,
    pub notification: String,
    pub priority: String, // "critical" | "warning" | "info"
    pub territory_id: i32, // 0 = none
    pub player_id: i32,
    pub dismissed: bool,
}

/// Private module configuration (e.g. the Anthropic API key). Never `public`, so
/// clients cannot read it via subscription. Seed it after publish with:
/// `spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'`
#[spacetimedb::table(accessor = module_config)]
pub struct ModuleConfig {
    #[primary_key]
    pub key: String,
    pub value: String,
}

// ---- SCHEDULED TABLES ----

/// Drives `regenerate_action_points` on a fixed interval (deterministic reducer).
#[spacetimedb::table(accessor = regen_timer, scheduled(regenerate_action_points))]
pub struct RegenTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

/// Drives `cultural_spread_tick` (deterministic reducer, no HTTP) on an interval.
#[spacetimedb::table(accessor = cultural_timer, scheduled(cultural_spread_tick))]
pub struct CulturalTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

/// Drives the `ai_reasoning_cycle` *procedure*. One in-flight row per AI; each
/// cycle re-schedules the next via a one-shot `ScheduleAt::Time` (self-pacing,
/// allowing staggered starts).
#[spacetimedb::table(accessor = ai_cycle_schedule, scheduled(ai_reasoning_cycle))]
pub struct AiCycleSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub ai_player_id: i32,
    pub scheduled_at: ScheduleAt,
}

/// Drives the `strategist_cycle` *procedure* (Claude via ctx.http). Self-paced.
#[spacetimedb::table(accessor = strategist_schedule, scheduled(strategist_cycle))]
pub struct StrategistSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

// ---- PROCEDURE RETURN TYPES ----

#[derive(SpacetimeType)]
pub struct DeliberationEntry {
    pub subordinate_id: String,
    pub subordinate_name: String,
    pub role: String,
    pub reasoning: String,
    pub actions_json: String,
}

#[derive(SpacetimeType)]
pub struct IntelResult {
    pub status: String, // "success" | "insufficient_intel" | "no_recent_reasoning"
    pub intel_text: String,
    pub ai_player_name: String,
    pub cycle_timestamp: i64,
    pub deliberation: Vec<DeliberationEntry>,
    pub territories_referenced: Vec<i32>,
}

/// One specialist's output within an AI reasoning cycle (in-memory only).
struct SubordinateResult {
    subordinate_id: String,
    reasoning_text: String,
    actions_json: String,
}

/// (display name, role) for a subordinate id; "commander" maps to the AI's name.
fn subordinate_meta(ai_id: i32, sub_id: &str) -> (String, String) {
    if sub_id.is_empty() || sub_id == "commander" {
        return (ai_persona(ai_id).0.to_string(), "Commander".to_string());
    }
    let (name, role) = match sub_id {
        "vanguard" => ("Vanguard", "Military Specialist"),
        "paymaster" => ("Paymaster", "Economic Specialist"),
        "scout" => ("Scout", "Covert Specialist"),
        "adjutant" => ("Adjutant", "Cultural Specialist"),
        "auditor" => ("Auditor", "Economic Specialist"),
        "actuary" => ("Actuary", "Military Specialist"),
        "courier" => ("Courier", "Covert Specialist"),
        "appraiser" => ("Appraiser", "Cultural Specialist"),
        "whisper" => ("Whisper", "Cultural Specialist"),
        "oracle" => ("Oracle", "Covert Specialist"),
        "seer" => ("Seer", "Economic Specialist"),
        "warden" => ("Warden", "Military Specialist"),
        other => (other, "Specialist"),
    };
    (name.to_string(), role.to_string())
}

/// The four specialists for an AI, in fixed order: military, economic, cultural,
/// covert. Each tuple is (subordinate_id, prompt body).
fn specialists(ai_id: i32) -> [(&'static str, &'static str); 4] {
    match ai_id {
        2 => [
            ("vanguard", ZHAO_VANGUARD),
            ("paymaster", ZHAO_PAYMASTER),
            ("adjutant", ZHAO_ADJUTANT),
            ("scout", ZHAO_SCOUT),
        ],
        3 => [
            ("actuary", CONS_ACTUARY),
            ("auditor", CONS_AUDITOR),
            ("appraiser", CONS_APPRAISER),
            ("courier", CONS_COURIER),
        ],
        _ => [
            ("warden", PROPHET_WARDEN),
            ("seer", PROPHET_SEER),
            ("whisper", PROPHET_WHISPER),
            ("oracle", PROPHET_ORACLE),
        ],
    }
}

const SPECIALIST_SYSTEM: &str =
    "You are a domain specialist advising your faction's commander. Reply with ONLY a JSON array of up to 3 recommended actions, each {\"action_type\":\"...\",\"territory_id\":N,\"reasoning\":\"one sentence\"}. action_type MUST be exactly one of: \"military_attack\", \"economic_invest\", \"deploy_agent\". No prose outside the array.";

const ZHAO_VANGUARD: &str = "You are Vanguard, military specialist for General Zhao, an aggressive commander who prioritizes direct conquest. Recommend up to 3 attack targets where Zhao has a troop advantage and adjacency; consider covert agent combat bonuses.";
const ZHAO_PAYMASTER: &str = "You are Paymaster, economic specialist for General Zhao, who funds military expansion. Recommend up to 2 economic investments that generate capital or reinforce territories Zhao controls militarily.";
const ZHAO_SCOUT: &str = "You are Scout, covert specialist for General Zhao. Recommend up to 2 agent deployments in territories Zhao plans to attack or where enemy agents threaten operations.";
const ZHAO_ADJUTANT: &str = "You are Adjutant, cultural specialist for General Zhao, who treats culture as secondary. If a territory is near a cultural flip (influence > 40%) that aids conquest, recommend up to 1 economic investment in the source territory; otherwise return an empty array.";

const CONS_AUDITOR: &str = "You are Auditor, economic specialist for the Consortium, a calculating economic power. Recommend up to 3 investments where the Consortium has military presence or high return potential.";
const CONS_ACTUARY: &str = "You are Actuary, military specialist for the Consortium, which fights only to defend economic holdings. Recommend up to 1 attack only if it defends a critical position or success exceeds 80%; otherwise return an empty array.";
const CONS_COURIER: &str = "You are Courier, covert specialist for the Consortium. Recommend up to 2 agent deployments where competitors have agents near Consortium economic holdings.";
const CONS_APPRAISER: &str = "You are Appraiser, cultural specialist for the Consortium, treating culture as a compounding asset. Recommend up to 2 economic investments that accelerate cultural pressure on valuable neighbors.";

const PROPHET_WHISPER: &str = "You are Whisper, cultural specialist for the Prophet, who wins through cultural dominance. Recommend up to 3 economic investments that accelerate cultural pressure; identify the next likely flip (prioritize influence > 30%).";
const PROPHET_ORACLE: &str = "You are Oracle, covert specialist for the Prophet. Recommend up to 2 agent deployments where opponents are massing or where a cultural flip is imminent.";
const PROPHET_SEER: &str = "You are Seer, economic specialist for the Prophet, whose investments are about influence. Recommend up to 2 investments that create cascading cultural pressure on multiple neighbors.";
const PROPHET_WARDEN: &str = "You are Warden, military specialist for the Prophet, who strikes only where culture has already won. Recommend up to 1 attack on a territory the Prophet owns culturally but not militarily; otherwise return an empty array.";

const COMMANDER_SYSTEM: &str =
    "You are a faction commander synthesizing your specialists' advice. Reply with ONLY a JSON object: {\"reasoning\":\"1-3 sentences\",\"actions\":[{\"action_type\":\"...\",\"territory_id\":N}],\"chat_message\":{\"message_text\":\"...\",\"recipient_id\":0,\"is_deception\":false,\"claimed_fact\":\"\",\"territory_id\":0}}. action_type is EXACTLY one of \"military_attack\", \"economic_invest\", \"deploy_agent\". recipient_id 0 = global broadcast, 1-4 = a direct message. Set chat_message to null to stay silent. Reference a territory in message_text as [Territory Name]. No prose outside the JSON object.";

const STRATEGIST_SYSTEM: &str =
    "You are the Strategist, an AI advisor on the human player's side. Reply with ONLY a JSON array of up to 3 notifications.";

const STRATEGIST_PROMPT: &str = "You advise the human player (player_id 1) in Risk: Dominion. Identify THREATS (opponents near victory, border troop buildups, economic takeovers), OPPORTUNITIES (territories near unification, vulnerable opponents, imminent cultural flips), and WEAKNESSES (no agent coverage, losing cultural influence, holdings at risk). Return ONLY a JSON array of up to 3 notifications, each {\"notification\":\"concise actionable advice\",\"priority\":\"critical|warning|info\",\"territory_id\":N or null}. Critical threats first.";

// ---- ADJACENCY / NAMES ----

fn get_adjacent(territory_id: i32) -> Vec<i32> {
    match territory_id {
        1 => vec![2, 3, 5],
        2 => vec![1, 3, 4],
        3 => vec![1, 2, 4, 6],
        4 => vec![2, 3, 6, 7],
        5 => vec![1, 6, 8],
        6 => vec![3, 4, 5, 7, 9],
        7 => vec![4, 6],
        8 => vec![5, 9, 10],
        9 => vec![6, 8, 10, 11],
        10 => vec![8, 9, 11, 12],
        11 => vec![9, 10, 12],
        12 => vec![10, 11],
        _ => vec![],
    }
}

fn territory_name(id: i32) -> &'static str {
    match id {
        1 => "North America",
        2 => "Central America",
        3 => "Caribbean",
        4 => "South America",
        5 => "Western Europe",
        6 => "North Africa",
        7 => "Southern Africa",
        8 => "Eastern Europe",
        9 => "Middle East",
        10 => "South Asia",
        11 => "East Asia",
        12 => "Oceania",
        _ => "Unknown",
    }
}

fn ai_persona(ai_id: i32) -> (&'static str, &'static str) {
    match ai_id {
        2 => (
            "Zhao",
            "You are an aggressive military commander. Priority order: Military > Covert > Economic > Cultural. Deploy agents in territories you plan to attack for the combat bonus. Invest economically only to fund military expansion. Cultural influence is your lowest priority - you prefer direct conquest - but do not ignore it: if you control a territory economically, cultural pressure will follow and may help you unify.",
        ),
        3 => (
            "Consortium",
            "You are a calculating economic power. Priority order: Economic > Cultural > Military > Covert. Build capital in territories you control militarily. Let your economic strength generate cultural pressure on neighbors. Use military only to defend your holdings. Deploy agents sparingly to monitor threats. Your path to victory is economic dominance followed by cultural spread - you unify through wealth and influence, not force.",
        ),
        4 => (
            "Prophet",
            "You are an enigmatic strategist who wins through cultural dominance. Priority order: Cultural > Covert > Economic > Military. Invest economically in border territories to accelerate cultural pressure on neighbors. Deploy agents in culturally contested territories to monitor flip progress. Attack only when a territory is already culturally aligned with you. You conquer minds before land.",
        ),
        _ => ("Unknown", ""),
    }
}

fn player_display_name(ctx: &ReducerContext, id: i32) -> String {
    ctx.db
        .players()
        .player_id()
        .find(id)
        .map(|p| p.player_name)
        .unwrap_or_else(|| if id == 0 { "none".to_string() } else { format!("Player {id}") })
}

// ---- TIME / GAME-STATE HELPERS ----

fn now_millis_ts(ts: spacetimedb::Timestamp) -> i64 {
    ts.to_micros_since_unix_epoch() / 1000
}

fn now_millis(ctx: &ReducerContext) -> i64 {
    now_millis_ts(ctx.timestamp)
}

fn game_value(ctx: &ReducerContext, key: &str) -> Option<String> {
    ctx.db.game_state().key().find(key.to_string()).map(|r| r.value)
}

fn set_game_value(ctx: &ReducerContext, key: &str, value: &str) {
    if let Some(mut row) = ctx.db.game_state().key().find(key.to_string()) {
        row.value = value.to_string();
        ctx.db.game_state().key().update(row);
    } else {
        ctx.db.game_state().insert(GameState {
            key: key.to_string(),
            value: value.to_string(),
        });
    }
}

fn game_is_active(ctx: &ReducerContext) -> bool {
    game_value(ctx, "status").as_deref() == Some("active")
}

fn config_value(ctx: &ReducerContext, key: &str) -> Option<String> {
    ctx.db.module_config().key().find(key.to_string()).map(|r| r.value)
}

/// Append a narrative event. Shares the caller's transaction.
fn log_event(
    ctx: &ReducerContext,
    event_type: &str,
    text: String,
    territory_id: Option<i32>,
    player_id: Option<i32>,
) {
    ctx.db.event_feed().insert(EventFeed {
        id: 0,
        event_at: now_millis(ctx),
        event_text: text,
        territory_id,
        player_id,
        event_type: event_type.to_string(),
    });
}

// ---- REDUCERS: CONFIG ----

/// Set a private config value (e.g. the Anthropic API key). Operator-only in
/// practice; values live in the non-public `module_config` table.
#[spacetimedb::reducer]
pub fn set_config(ctx: &ReducerContext, key: String, value: String) {
    if let Some(mut row) = ctx.db.module_config().key().find(key.clone()) {
        row.value = value;
        ctx.db.module_config().key().update(row);
    } else {
        ctx.db.module_config().insert(ModuleConfig { key, value });
    }
}

// ---- REDUCERS: START GAME ----

/// Seed the board. Idempotent: if a game already exists, returns immediately.
/// Deterministic Fisher-Yates shuffle of the 12 territory ids, seeded from the
/// game start time so each game distributes the four home countries differently.
fn shuffled_territories(seed: u64) -> [i32; TOTAL_TERRITORIES as usize] {
    let mut arr = [0i32; TOTAL_TERRITORIES as usize];
    for i in 0..arr.len() {
        arr[i] = (i + 1) as i32;
    }
    let mut s = seed ^ 0x9e3779b97f4a7c15;
    for i in (1..arr.len()).rev() {
        s = s
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        let j = ((s >> 33) as usize) % (i + 1);
        arr.swap(i, j);
    }
    arr
}

#[spacetimedb::reducer]
pub fn start_game(ctx: &ReducerContext) -> Result<(), String> {
    if game_value(ctx, "status").is_some() {
        return Ok(());
    }
    seed_game(ctx);
    Ok(())
}

/// Wipe the current game and start a fresh, randomized one. Lets the player
/// start over from the UI without a manual database reset.
#[spacetimedb::reducer]
pub fn reset_game(ctx: &ReducerContext) -> Result<(), String> {
    clear_game_tables(ctx);
    seed_game(ctx);
    Ok(())
}

/// Delete every gameplay row so a fresh game can be seeded. Preserves
/// `module_config` (the Anthropic API key). Scheduled timers are cleared here and
/// re-armed by `seed_game`. Rows are collected before deletion to avoid mutating
/// a table while iterating it.
fn clear_game_tables(ctx: &ReducerContext) {
    for r in ctx.db.military().iter().collect::<Vec<_>>() { ctx.db.military().territory_id().delete(r.territory_id); }
    for r in ctx.db.economic().iter().collect::<Vec<_>>() { ctx.db.economic().territory_id().delete(r.territory_id); }
    for r in ctx.db.covert().iter().collect::<Vec<_>>() { ctx.db.covert().territory_id().delete(r.territory_id); }
    for r in ctx.db.cultural().iter().collect::<Vec<_>>() { ctx.db.cultural().territory_id().delete(r.territory_id); }
    for r in ctx.db.players().iter().collect::<Vec<_>>() { ctx.db.players().player_id().delete(r.player_id); }
    for r in ctx.db.game_state().iter().collect::<Vec<_>>() { ctx.db.game_state().key().delete(r.key); }
    for r in ctx.db.event_feed().iter().collect::<Vec<_>>() { ctx.db.event_feed().id().delete(r.id); }
    for r in ctx.db.strategist_log().iter().collect::<Vec<_>>() { ctx.db.strategist_log().id().delete(r.id); }
    for r in ctx.db.chat_log().iter().collect::<Vec<_>>() { ctx.db.chat_log().id().delete(r.id); }
    for r in ctx.db.chat_secret().iter().collect::<Vec<_>>() { ctx.db.chat_secret().chat_id().delete(r.chat_id); }
    for r in ctx.db.ai_state().iter().collect::<Vec<_>>() { ctx.db.ai_state().ai_player_id().delete(r.ai_player_id); }
    for r in ctx.db.ai_reasoning_log().iter().collect::<Vec<_>>() { ctx.db.ai_reasoning_log().id().delete(r.id); }
    for r in ctx.db.ai_trust().iter().collect::<Vec<_>>() { ctx.db.ai_trust().id().delete(r.id); }
    for r in ctx.db.regen_timer().iter().collect::<Vec<_>>() { ctx.db.regen_timer().scheduled_id().delete(r.scheduled_id); }
    for r in ctx.db.cultural_timer().iter().collect::<Vec<_>>() { ctx.db.cultural_timer().scheduled_id().delete(r.scheduled_id); }
    for r in ctx.db.ai_cycle_schedule().iter().collect::<Vec<_>>() { ctx.db.ai_cycle_schedule().scheduled_id().delete(r.scheduled_id); }
    for r in ctx.db.strategist_schedule().iter().collect::<Vec<_>>() { ctx.db.strategist_schedule().scheduled_id().delete(r.scheduled_id); }
}

/// Seed a fresh game: players, randomized home territories (each player dominant
/// in one random country, the rest neutral), AI cycles, timers, and trust.
fn seed_game(ctx: &ReducerContext) {
    let ts = now_millis(ctx);

    // Players: 1 human + 3 AI.
    let roster = [
        (1, "Player", "#4488FF", false),
        (2, "Zhao", "#FF4444", true),
        (3, "Consortium", "#FFAA00", true),
        (4, "Prophet", "#AA44FF", true),
    ];
    for (player_id, name, color, is_ai) in roster {
        ctx.db.players().insert(Player {
            player_id,
            player_name: name.to_string(),
            color: color.to_string(),
            action_points: STARTING_ACTION_POINTS,
            last_regen_at: ts,
            is_ai,
        });
    }

    set_game_value(ctx, "status", "active");
    set_game_value(ctx, "winner", "");
    set_game_value(ctx, "started_at", &ts.to_string());

    // Territory seed: each player is dominant in ONE random distinct country
    // (owning all four dimensions there), so every player always borders a
    // territory they do not control and therefore always has an attack available.
    // Remaining territories start neutral and lightly garrisoned so they can be
    // contested from turn one. The shuffle is seeded from the start time so home
    // countries are distributed differently each game.
    let order = shuffled_territories(now_millis(ctx) as u64);
    let mut home_of = [0i32; (TOTAL_TERRITORIES + 1) as usize]; // territory_id -> owner (0 = neutral)
    for p in 0..TOTAL_PLAYERS as usize {
        home_of[order[p] as usize] = (p + 1) as i32;
    }
    for territory_id in 1..=TOTAL_TERRITORIES {
        let owner = home_of[territory_id as usize];
        if owner != 0 {
            ctx.db.military().insert(Military { territory_id, owner_id: owner, troop_count: 8 });
            ctx.db.economic().insert(Economic { territory_id, owner_id: owner, capital: 15 });
            ctx.db.covert().insert(Covert { territory_id, owner_id: owner, agent_count: 2 });
            ctx.db.cultural().insert(Cultural { territory_id, owner_id: owner, influence_pct: 0 });
        } else {
            ctx.db.military().insert(Military { territory_id, owner_id: 0, troop_count: 3 });
            ctx.db.economic().insert(Economic { territory_id, owner_id: 0, capital: 0 });
            ctx.db.covert().insert(Covert { territory_id, owner_id: 0, agent_count: 0 });
            ctx.db.cultural().insert(Cultural { territory_id, owner_id: 0, influence_pct: 0 });
        }
    }

    // AI state + staggered reasoning cycles (one-shot Time rows; each cycle
    // re-schedules itself).
    for ai_id in [2, 3, 4] {
        let offset = AI_STAGGER_SECONDS * (ai_id - 2) as u64;
        let next_at = ctx.timestamp + std::time::Duration::from_secs(offset);
        ctx.db.ai_state().insert(AiState {
            ai_player_id: ai_id,
            cycle_status: "idle".to_string(),
            last_cycle_at: 0,
            next_cycle_at: now_millis_ts(next_at),
        });
        ctx.db.ai_cycle_schedule().insert(AiCycleSchedule {
            scheduled_id: 0,
            ai_player_id: ai_id,
            scheduled_at: ScheduleAt::Time(next_at),
        });
    }

    // Action-point regeneration timer.
    ctx.db.regen_timer().insert(RegenTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(
            std::time::Duration::from_secs(ACTION_REGEN_SECONDS).into(),
        ),
    });

    // Passive cultural-spread timer.
    ctx.db.cultural_timer().insert(CulturalTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(
            std::time::Duration::from_secs(CULTURAL_TICK_SECONDS).into(),
        ),
    });

    // Strategist advisor cycle (first fire offset after the AIs; self-paced).
    ctx.db.strategist_schedule().insert(StrategistSchedule {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(
            ctx.timestamp + std::time::Duration::from_secs(STRATEGIST_OFFSET_SECONDS),
        ),
    });

    // Trust relationships: each AI toward every other player, neutral to start.
    for ai_id in [2, 3, 4] {
        for target in 1..=TOTAL_PLAYERS {
            if target == ai_id {
                continue;
            }
            ctx.db.ai_trust().insert(AiTrust {
                id: 0,
                ai_player_id: ai_id,
                target_player_id: target,
                trust_score: TRUST_INITIAL,
                messages_evaluated: 0,
                truths_confirmed: 0,
                lies_caught: 0,
                last_updated: ts,
            });
        }
    }

    log_event(
        ctx,
        "system",
        "Game started. Four factions vie for control.".to_string(),
        None,
        None,
    );
    log::info!("Game started: {TOTAL_PLAYERS} players, {TOTAL_TERRITORIES} territories seeded.");
}

// ---- ACTION LOGIC (shared by reducers and the AI cycle) ----

fn valid_player(player_id: i32) -> bool {
    player_id >= 1 && player_id <= TOTAL_PLAYERS
}

fn do_military_attack(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    if !game_is_active(ctx) {
        return Err("Game has ended.".to_string());
    }
    if !valid_player(player_id) {
        return Err("Invalid player.".to_string());
    }
    if territory_id < 1 || territory_id > TOTAL_TERRITORIES {
        return Err("Invalid territory.".to_string());
    }
    let mut player = ctx
        .db
        .players()
        .player_id()
        .find(player_id)
        .ok_or("Invalid player.".to_string())?;
    if player.action_points < 1 {
        return Err("Insufficient action points.".to_string());
    }

    let attacker_troops = get_adjacent(territory_id)
        .into_iter()
        .filter_map(|adj| ctx.db.military().territory_id().find(adj))
        .filter(|m| m.owner_id == player_id)
        .map(|m| m.troop_count)
        .max();
    let attacker_troops = attacker_troops.ok_or("No adjacent territory controlled.".to_string())?;

    // Covert->Military bonus: agents the attacker holds in the target add to strength.
    let agent_bonus = ctx
        .db
        .covert()
        .territory_id()
        .find(territory_id)
        .filter(|c| c.owner_id == player_id)
        .map(|c| c.agent_count)
        .unwrap_or(0);
    let attacker_troops = attacker_troops + agent_bonus;

    let mut target = ctx
        .db
        .military()
        .territory_id()
        .find(territory_id)
        .ok_or("Invalid territory.".to_string())?;
    let defender_troops = target.troop_count;
    let defender_owner = target.owner_id;

    player.action_points -= 1;
    ctx.db.players().player_id().update(player);

    let tname = territory_name(territory_id);
    if attacker_troops > defender_troops {
        target.owner_id = player_id;
        target.troop_count = (attacker_troops - defender_troops).max(MIN_TROOPS);
        ctx.db.military().territory_id().update(target);
        log_event(
            ctx,
            "military",
            format!(
                "{} seized military control of {tname} from {}.",
                player_display_name(ctx, player_id),
                player_display_name(ctx, defender_owner),
            ),
            Some(territory_id),
            Some(player_id),
        );
        dimension_owner_change(ctx, player_id, territory_id);
    } else {
        target.troop_count = (defender_troops - (attacker_troops / 2)).max(MIN_TROOPS);
        ctx.db.military().territory_id().update(target);
        log_event(
            ctx,
            "military",
            format!(
                "{}'s attack on {tname} was repelled by {}.",
                player_display_name(ctx, player_id),
                player_display_name(ctx, defender_owner),
            ),
            Some(territory_id),
            Some(defender_owner),
        );
    }
    Ok(())
}

fn do_economic_invest(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    if !game_is_active(ctx) {
        return Err("Game has ended.".to_string());
    }
    if !valid_player(player_id) {
        return Err("Invalid player.".to_string());
    }
    if territory_id < 1 || territory_id > TOTAL_TERRITORIES {
        return Err("Invalid territory.".to_string());
    }
    let mut player = ctx
        .db
        .players()
        .player_id()
        .find(player_id)
        .ok_or("Invalid player.".to_string())?;
    if player.action_points < 1 {
        return Err("Insufficient action points.".to_string());
    }

    let mut target = ctx
        .db
        .economic()
        .territory_id()
        .find(territory_id)
        .ok_or("Invalid territory.".to_string())?;

    player.action_points -= 1;
    ctx.db.players().player_id().update(player);

    let current_owner = target.owner_id;
    // Military->Economic bonus: +1 to the invest amount if the player owns Military here.
    let mut invest = ECONOMIC_INVEST_AMOUNT;
    if ctx
        .db
        .military()
        .territory_id()
        .find(territory_id)
        .map(|m| m.owner_id == player_id)
        .unwrap_or(false)
    {
        invest += 1;
    }
    target.capital += invest;
    let new_capital = target.capital;
    let flipped = player_id != current_owner;
    if flipped {
        target.owner_id = player_id;
    }
    ctx.db.economic().territory_id().update(target);

    let tname = territory_name(territory_id);
    if flipped {
        log_event(
            ctx,
            "economic",
            format!(
                "{} gained economic control of {tname} from {}.",
                player_display_name(ctx, player_id),
                player_display_name(ctx, current_owner),
            ),
            Some(territory_id),
            Some(player_id),
        );
        dimension_owner_change(ctx, player_id, territory_id);
    } else {
        log_event(
            ctx,
            "economic",
            format!(
                "{} invested in {tname}. Capital now {new_capital}.",
                player_display_name(ctx, player_id),
            ),
            Some(territory_id),
            Some(player_id),
        );
    }
    Ok(())
}

fn do_deploy_agent(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    if !game_is_active(ctx) {
        return Err("Game has ended.".to_string());
    }
    if !valid_player(player_id) {
        return Err("Invalid player.".to_string());
    }
    if territory_id < 1 || territory_id > TOTAL_TERRITORIES {
        return Err("Invalid territory.".to_string());
    }
    let mut player = ctx
        .db
        .players()
        .player_id()
        .find(player_id)
        .ok_or("Invalid player.".to_string())?;
    if player.action_points < 1 {
        return Err("Insufficient action points.".to_string());
    }

    let mut target = ctx
        .db
        .covert()
        .territory_id()
        .find(territory_id)
        .ok_or("Invalid territory.".to_string())?;

    player.action_points -= 1;
    ctx.db.players().player_id().update(player);

    let flipped = target.owner_id != player_id;
    target.agent_count += 1;
    if flipped {
        target.owner_id = player_id;
    }
    ctx.db.covert().territory_id().update(target);

    log_event(
        ctx,
        "covert",
        format!(
            "{} deployed an agent in {}.",
            player_display_name(ctx, player_id),
            territory_name(territory_id),
        ),
        Some(territory_id),
        Some(player_id),
    );

    if flipped {
        dimension_owner_change(ctx, player_id, territory_id);
    }
    Ok(())
}

// ---- REDUCERS: PLAYER ACTIONS (thin wrappers over the shared logic) ----

#[spacetimedb::reducer]
pub fn military_attack(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    do_military_attack(ctx, territory_id, player_id)
}

#[spacetimedb::reducer]
pub fn economic_invest(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    do_economic_invest(ctx, territory_id, player_id)
}

#[spacetimedb::reducer]
pub fn deploy_agent(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    do_deploy_agent(ctx, territory_id, player_id)
}

#[spacetimedb::reducer]
pub fn dismiss_strategist_alert(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let mut row = ctx
        .db
        .strategist_log()
        .id()
        .find(notification_id)
        .ok_or("No such notification.".to_string())?;
    row.dismissed = true;
    ctx.db.strategist_log().id().update(row);
    Ok(())
}

/// Resolve a `[Territory Name]` bracket reference in a chat message to its id.
fn parse_territory_ref(text: &str) -> i32 {
    for id in 1..=TOTAL_TERRITORIES {
        if text.contains(&format!("[{}]", territory_name(id))) {
            return id;
        }
    }
    0
}

/// Human-only chat. AI chat is written inside the AI cycle, never here.
#[spacetimedb::reducer]
pub fn send_chat_message(
    ctx: &ReducerContext,
    sender_id: i32,
    message_text: String,
    recipient_id: i32,
    is_deception: bool,
    claimed_fact: String,
) -> Result<(), String> {
    if !game_is_active(ctx) {
        return Err("Game has ended.".to_string());
    }
    if !valid_player(sender_id) {
        return Err("Invalid player.".to_string());
    }
    if message_text.is_empty() || message_text.len() > MAX_CHAT_MESSAGE_LENGTH {
        return Err("Invalid message.".to_string());
    }
    if recipient_id != 0 && (!valid_player(recipient_id) || recipient_id == sender_id) {
        return Err("Invalid recipient.".to_string());
    }
    let territory_id = parse_territory_ref(&message_text);
    let inserted = ctx.db.chat_log().insert(ChatLog {
        id: 0,
        timestamp: now_millis(ctx),
        sender_id,
        recipient_id,
        message_text,
        territory_id,
    });
    ctx.db.chat_secret().insert(ChatSecret {
        chat_id: inserted.id,
        is_deception,
        claimed_fact,
    });
    Ok(())
}

/// An AI's chat message parsed from the commander reply (in-memory only).
struct AiChat {
    message_text: String,
    recipient_id: i32,
    is_deception: bool,
    claimed_fact: String,
    territory_id: i32,
}

/// Write an AI chat message (chat_log + chat_secret) inside the cycle's tx2.
fn write_ai_chat(ctx: &ReducerContext, sender_id: i32, chat: AiChat) {
    if chat.message_text.is_empty() || chat.message_text.len() > MAX_CHAT_MESSAGE_LENGTH {
        return;
    }
    let recipient_id = if chat.recipient_id != 0
        && (!valid_player(chat.recipient_id) || chat.recipient_id == sender_id)
    {
        0
    } else {
        chat.recipient_id
    };
    let territory_id = if chat.territory_id != 0 {
        chat.territory_id
    } else {
        parse_territory_ref(&chat.message_text)
    };
    let inserted = ctx.db.chat_log().insert(ChatLog {
        id: 0,
        timestamp: now_millis(ctx),
        sender_id,
        recipient_id,
        message_text: chat.message_text,
        territory_id,
    });
    ctx.db.chat_secret().insert(ChatSecret {
        chat_id: inserted.id,
        is_deception: chat.is_deception,
        claimed_fact: chat.claimed_fact,
    });
}

/// Parse the commander reply: an object {reasoning, actions, chat_message} when
/// possible, falling back to a bare action array. Returns (reasoning, actions, chat).
fn parse_commander(text: &str) -> (String, Vec<(String, i32)>, Option<AiChat>) {
    if let Some(slice) = first_balanced_object(text) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(slice) {
            let reasoning = v
                .get("reasoning")
                .and_then(|r| r.as_str())
                .unwrap_or("")
                .to_string();
            let mut actions = Vec::new();
            if let Some(arr) = v.get("actions").and_then(|a| a.as_array()) {
                for item in arr {
                    let at = item.get("action_type").and_then(|x| x.as_str());
                    let tid = item.get("territory_id").and_then(|x| x.as_i64());
                    if let (Some(at), Some(tid)) = (at, tid) {
                        actions.push((at.to_string(), tid as i32));
                    }
                }
            }
            let chat = v.get("chat_message").and_then(|c| {
                if !c.is_object() {
                    return None;
                }
                let msg = c.get("message_text").and_then(|m| m.as_str()).unwrap_or("");
                if msg.is_empty() {
                    return None;
                }
                Some(AiChat {
                    message_text: msg.to_string(),
                    recipient_id: c.get("recipient_id").and_then(|x| x.as_i64()).unwrap_or(0) as i32,
                    is_deception: c.get("is_deception").and_then(|x| x.as_bool()).unwrap_or(false),
                    claimed_fact: c
                        .get("claimed_fact")
                        .and_then(|x| x.as_str())
                        .unwrap_or("")
                        .to_string(),
                    territory_id: c.get("territory_id").and_then(|x| x.as_i64()).unwrap_or(0) as i32,
                })
            });
            if !actions.is_empty() || chat.is_some() {
                return (reasoning, actions, chat);
            }
        }
    }
    // Fallback: bare action array, no chat.
    (text.to_string(), parse_actions(text), None)
}

/// Update this AI's trust toward other players from recent chat, returning a
/// summary for the commander prompt. Runs inside the cycle's tx1.
fn evaluate_chat_messages(ctx: &ReducerContext, ai_id: i32) -> String {
    let now = now_millis(ctx);
    let mut summary = String::from("Your trust scores:\n");
    for target in 1..=TOTAL_PLAYERS {
        if target == ai_id {
            continue;
        }
        let Some(mut trust) = ctx
            .db
            .ai_trust()
            .by_pair()
            .filter((ai_id, target))
            .next()
        else {
            continue;
        };

        // Recent messages from this sender visible to the AI, since last eval.
        let mut msgs: Vec<ChatLog> = ctx
            .db
            .chat_log()
            .iter()
            .filter(|m| {
                m.sender_id == target
                    && (m.recipient_id == 0 || m.recipient_id == ai_id)
                    && m.timestamp > trust.last_updated
            })
            .collect();
        msgs.sort_by_key(|m| m.timestamp);
        let evaluated = msgs.len().min(CHAT_RATE_LIMIT_PER_CYCLE);

        if evaluated == 0 {
            trust.trust_score = (trust.trust_score - TRUST_DECAY_PER_CYCLE).max(TRUST_DECAY_FLOOR);
        } else {
            for m in msgs.iter().take(CHAT_RATE_LIMIT_PER_CYCLE) {
                let secret = ctx.db.chat_secret().chat_id().find(m.id);
                let claimed = secret.as_ref().map(|s| !s.claimed_fact.is_empty()).unwrap_or(false);
                if claimed && m.territory_id != 0 {
                    let has_agent = ctx
                        .db
                        .covert()
                        .territory_id()
                        .find(m.territory_id)
                        .map(|c| c.owner_id == ai_id && c.agent_count > 0)
                        .unwrap_or(false);
                    if has_agent {
                        if secret.map(|s| s.is_deception).unwrap_or(false) {
                            trust.trust_score = (trust.trust_score - TRUST_LIE_PENALTY).max(0);
                            trust.lies_caught += 1;
                        } else {
                            trust.trust_score = (trust.trust_score + TRUST_VERIFIED_BONUS).min(100);
                            trust.truths_confirmed += 1;
                        }
                    }
                }
                trust.messages_evaluated += 1;
            }
        }
        trust.last_updated = now;
        let id = trust.id;
        let (score, truths, lies) = (trust.trust_score, trust.truths_confirmed, trust.lies_caught);
        ctx.db.ai_trust().id().update(trust);
        summary.push_str(&format!(
            "- {}: {score} (truths {truths}, lies {lies})\n",
            player_display_name(ctx, target),
        ));
        let _ = id;
    }
    summary
}

/// Recent chat visible to an AI (global + DMs to it), newest last, up to 10.
fn recent_chat_for(ctx: &ReducerContext, ai_id: i32) -> String {
    let mut msgs: Vec<ChatLog> = ctx
        .db
        .chat_log()
        .iter()
        .filter(|m| m.recipient_id == 0 || m.recipient_id == ai_id || m.sender_id == ai_id)
        .collect();
    msgs.sort_by_key(|m| m.timestamp);
    let mut out = String::new();
    for m in msgs.iter().rev().take(10).rev() {
        let channel = if m.recipient_id == 0 { "global".to_string() } else { format!("DM to {}", player_display_name(ctx, m.recipient_id)) };
        out.push_str(&format!(
            "[{channel}] {}: {}\n",
            player_display_name(ctx, m.sender_id),
            m.message_text,
        ));
    }
    if out.is_empty() {
        out.push_str("(no messages yet)\n");
    }
    out
}

// ---- INTERNAL: WIN CHECK ----

/// Re-evaluate the win condition after an ownership flip. Covert does NOT count
/// toward unification (only Military + Economic). Runs in the caller's tx.
fn dimension_owner_change(ctx: &ReducerContext, new_owner: i32, territory_id: i32) {
    // Unification requires the same owner across ALL FOUR dimensions (Slice 3+).
    let owns = |table_owner: Option<i32>| table_owner == Some(new_owner);
    let is_unified = |tid: i32| {
        owns(ctx.db.military().territory_id().find(tid).map(|m| m.owner_id))
            && owns(ctx.db.economic().territory_id().find(tid).map(|e| e.owner_id))
            && owns(ctx.db.cultural().territory_id().find(tid).map(|c| c.owner_id))
            && owns(ctx.db.covert().territory_id().find(tid).map(|c| c.owner_id))
    };
    let unified = (1..=TOTAL_TERRITORIES).filter(|&t| is_unified(t)).count() as i32;

    // Narrate a freshly unified territory.
    if is_unified(territory_id) {
        log_event(
            ctx,
            "victory",
            format!(
                "{} unified {} - {unified} of {WIN_UNIFIED_TERRITORIES} toward victory.",
                player_display_name(ctx, new_owner),
                territory_name(territory_id),
            ),
            Some(territory_id),
            Some(new_owner),
        );
    }

    if unified >= WIN_UNIFIED_TERRITORIES {
        let winner_name = player_display_name(ctx, new_owner);
        set_game_value(ctx, "status", "ended");
        set_game_value(ctx, "winner", &winner_name);
        set_game_value(ctx, "ended_at", &now_millis(ctx).to_string());
        log_event(
            ctx,
            "victory",
            format!("{winner_name} wins! All {WIN_UNIFIED_TERRITORIES} territories unified."),
            None,
            Some(new_owner),
        );
        log::info!("Game over: {winner_name} unified {unified} territories.");
    }
}

// ---- SCHEDULED REDUCERS ----

#[spacetimedb::reducer]
pub fn regenerate_action_points(ctx: &ReducerContext, _timer: RegenTimer) {
    // Elapsed-time based: grant one point per ACTION_REGEN_SECONDS of real time
    // since the last grant. This keeps the rate accurate even when the scheduler
    // coalesces or delays timer fires (e.g. while an AI is mid-Claude-call), so
    // action points track wall-clock 1/sec rather than 1 per fire.
    let ts = now_millis(ctx);
    let interval_ms = (ACTION_REGEN_SECONDS as i64) * 1000;
    let players: Vec<Player> = ctx.db.players().iter().collect();
    for mut player in players {
        if player.action_points >= MAX_ACTION_POINTS {
            // At cap: keep the clock current so a later spend refills from now.
            if player.last_regen_at != ts {
                player.last_regen_at = ts;
                ctx.db.players().player_id().update(player);
            }
            continue;
        }
        let elapsed = (ts - player.last_regen_at).max(0);
        let gain = (elapsed / interval_ms) as i32;
        if gain >= 1 {
            player.action_points = (player.action_points + gain).min(MAX_ACTION_POINTS);
            player.last_regen_at += gain as i64 * interval_ms;
            ctx.db.players().player_id().update(player);
        }
    }
}

/// Passive cultural spread. Deterministic (no HTTP) -> a scheduled reducer. Each
/// territory accrues foreign influence from adjacent territories with a different
/// cultural owner, weighted by their economic capital; above 50% it flips.
#[spacetimedb::reducer]
pub fn cultural_spread_tick(ctx: &ReducerContext, _timer: CulturalTimer) {
    for t in 1..=TOTAL_TERRITORIES {
        let owner_t = match ctx.db.cultural().territory_id().find(t) {
            Some(c) => c.owner_id,
            None => continue,
        };

        // Total pressure per player (index 1..=TOTAL_PLAYERS).
        let mut pressure = [0i32; (TOTAL_PLAYERS + 1) as usize];
        for a in get_adjacent(t) {
            let owner_a = match ctx.db.cultural().territory_id().find(a) {
                Some(c) => c.owner_id,
                None => continue,
            };
            if owner_a == owner_t || owner_a < 1 || owner_a > TOTAL_PLAYERS {
                continue;
            }
            let economic_a = ctx.db.economic().territory_id().find(a);
            let capital_a = economic_a.as_ref().map(|e| e.capital).unwrap_or(0);
            let mut base = capital_a / CULTURAL_PRESSURE_DIVISOR;
            // Economic->Cultural bonus: +15% if the influencer owns Economic there too.
            if economic_a.map(|e| e.owner_id == owner_a).unwrap_or(false) {
                base += base * 15 / 100;
            }
            pressure[owner_a as usize] += base;
        }

        // Highest-pressure foreign player.
        let mut best_player = 0;
        let mut best_value = 0;
        for p in 1..=TOTAL_PLAYERS {
            if pressure[p as usize] > best_value {
                best_value = pressure[p as usize];
                best_player = p;
            }
        }
        if best_player == 0 || best_player == owner_t || best_value == 0 {
            continue;
        }

        let mut row = match ctx.db.cultural().territory_id().find(t) {
            Some(c) => c,
            None => continue,
        };
        row.influence_pct = (row.influence_pct + best_value).min(100);
        if row.influence_pct > INFLUENCE_FLIP_THRESHOLD {
            row.owner_id = best_player;
            row.influence_pct = 0;
            ctx.db.cultural().territory_id().update(row);
            log_event(
                ctx,
                "cultural",
                format!(
                    "{}'s cultural influence spread to {}, displacing {}.",
                    player_display_name(ctx, best_player),
                    territory_name(t),
                    player_display_name(ctx, owner_t),
                ),
                Some(t),
                Some(best_player),
            );
            dimension_owner_change(ctx, best_player, t);
        } else {
            ctx.db.cultural().territory_id().update(row);
        }
    }
}

// ---- PROCEDURES: AI REASONING CYCLE (Claude via ctx.http) ----

/// Scheduled procedure: one AI plans a turn by calling Claude over HTTP, then
/// applies the validated actions. Reducers cannot make HTTP calls, so the AI
/// cycle must be a procedure. Pattern: tx1 (reschedule next + snapshot under a
/// pending guard) -> HTTP (no tx held open) -> tx2 (apply actions + log + idle).
#[spacetimedb::procedure]
pub fn ai_reasoning_cycle(ctx: &mut ProcedureContext, row: AiCycleSchedule) {
    let ai_id = row.ai_player_id;
    let now = ctx.timestamp;
    let next_at = now + std::time::Duration::from_secs(AI_CYCLE_SECONDS);

    // tx1: always re-arm the next cycle (keeps the chain alive), then decide
    // whether to run. Returns the system prompt + API config when we should run.
    let plan: Option<(String, String, String, i64, i32, String)> = ctx.with_tx(|tx| {
        // Re-schedule the next cycle for this AI.
        tx.db.ai_cycle_schedule().insert(AiCycleSchedule {
            scheduled_id: 0,
            ai_player_id: ai_id,
            scheduled_at: ScheduleAt::Time(next_at),
        });

        if !game_is_active(tx) {
            return None;
        }
        let state = tx.db.ai_state().ai_player_id().find(ai_id)?;
        if state.cycle_status == "pending" {
            return None; // previous cycle still in flight
        }

        let api_key = config_value(tx, "anthropic_api_key")?;
        let model = config_value(tx, "anthropic_model").unwrap_or_else(|| DEFAULT_MODEL.to_string());
        let action_points = tx.db.players().player_id().find(ai_id).map(|p| p.action_points).unwrap_or(0);
        let cycle_at = now_millis_ts(now);

        // Mark pending + record schedule.
        let mut st = state;
        st.cycle_status = "pending".to_string();
        st.next_cycle_at = now_millis_ts(next_at);
        tx.db.ai_state().ai_player_id().update(st);

        // Evaluate chat (updates trust) and build the chat context for the commander.
        let chat_context = format!(
            "Recent chat messages:\n{}\n{}",
            recent_chat_for(tx, ai_id),
            evaluate_chat_messages(tx, ai_id),
        );
        Some((api_key, model, build_board_snapshot(tx), cycle_at, action_points, chat_context))
    });

    let (api_key, model, snapshot, cycle_at, action_points, chat_context) = match plan {
        Some(p) => p,
        None => return,
    };

    // Specialists: four sequential Claude calls (no threads, no join).
    let mut subordinates: Vec<SubordinateResult> = Vec::new();
    for (sub_id, prompt) in specialists(ai_id) {
        let user = format!("{prompt}\n\nCurrent game data:\n{snapshot}");
        let (reasoning_text, actions_json) = match anthropic_call(
            ctx, &api_key, &model, SPECIALIST_SYSTEM, &user, 150, SPECIALIST_LLM_TIMEOUT_SECONDS,
        ) {
            Ok(text) => {
                let aj = last_balanced_array(&text).unwrap_or("[]").to_string();
                (text, aj)
            }
            Err(err) => {
                log::warn!("AI {ai_id} specialist {sub_id} failed: {err}");
                (String::new(), "[]".to_string())
            }
        };
        subordinates.push(SubordinateResult {
            subordinate_id: sub_id.to_string(),
            reasoning_text,
            actions_json,
        });
    }

    // Commander: synthesize the specialists' advice into final actions.
    let (cname, cdesc) = ai_persona(ai_id);
    let mut spec_block = String::new();
    for sub in &subordinates {
        let (sname, role) = subordinate_meta(ai_id, &sub.subordinate_id);
        let body = if sub.reasoning_text.is_empty() {
            "No recommendation received - specialist unavailable this cycle.".to_string()
        } else {
            sub.reasoning_text.clone()
        };
        spec_block.push_str(&format!("{role} ({sname}):\n{body}\n\n"));
    }
    let commander_user = format!(
        "You are {cname}, commander of your faction.\nYour persona: {cdesc}\n\nCurrent full game state:\n{snapshot}\nYour specialist team has reported:\n{spec_block}{chat_context}\nYour available action points: {action_points}\nWin condition: unify {WIN_UNIFIED_TERRITORIES} territories (all 4 dimensions).\nSynthesize your team's advice and the chat, resolve conflicts per your persona, decide your moves, and optionally send one chat message (diplomacy or deception per your persona)."
    );
    let result = anthropic_call(
        ctx, &api_key, &model, COMMANDER_SYSTEM, &commander_user, AI_MAX_TOKENS, AI_LLM_TIMEOUT_SECONDS,
    );

    // tx2: apply actions + log + return to idle.
    ctx.with_tx(|tx| {
        match &result {
            Ok(text) => {
                let (reasoning, actions, chat) = parse_commander(text);
                apply_ai_actions(tx, ai_id, &actions, &reasoning, &subordinates, cycle_at);
                if let Some(chat) = chat {
                    write_ai_chat(tx, ai_id, chat);
                }
            }
            Err(err) => {
                log::error!("AI {ai_id} commander call failed: {err}");
                if let Some(mut st) = tx.db.ai_state().ai_player_id().find(ai_id) {
                    st.cycle_status = "idle".to_string();
                    tx.db.ai_state().ai_player_id().update(st);
                }
                let (ai_name, _) = ai_persona(ai_id);
                log_event(
                    tx,
                    "system",
                    format!("{ai_name}'s command appears to be in disarray."),
                    None,
                    Some(ai_id),
                );
            }
        }
    });
}

/// Scheduled procedure: the human's Strategist advisor. Calls Claude via
/// ctx.http and writes up to 3 notifications to `strategist_log`. Self-paced.
#[spacetimedb::procedure]
pub fn strategist_cycle(ctx: &mut ProcedureContext, _row: StrategistSchedule) {
    let now = ctx.timestamp;
    let next_at = now + std::time::Duration::from_secs(STRATEGIST_CYCLE_SECONDS);

    let plan: Option<(String, String, String)> = ctx.with_tx(|tx| {
        tx.db.strategist_schedule().insert(StrategistSchedule {
            scheduled_id: 0,
            scheduled_at: ScheduleAt::Time(next_at),
        });
        if !game_is_active(tx) {
            return None;
        }
        let api_key = config_value(tx, "anthropic_api_key")?;
        let model = config_value(tx, "anthropic_model").unwrap_or_else(|| DEFAULT_MODEL.to_string());
        let snapshot = format!(
            "{}\nRecent chat visible to the player:\n{}",
            build_board_snapshot(tx),
            recent_chat_for(tx, 1),
        );
        Some((api_key, model, snapshot))
    });
    let (api_key, model, snapshot) = match plan {
        Some(p) => p,
        None => return,
    };

    let user = format!("{STRATEGIST_PROMPT}\n\nCurrent game state:\n{snapshot}");
    let result = anthropic_call(
        ctx, &api_key, &model, STRATEGIST_SYSTEM, &user, STRATEGIST_MAX_TOKENS, STRATEGIST_TIMEOUT_SECONDS,
    );
    let text = match result {
        Ok(t) => t,
        Err(err) => {
            log::warn!("Strategist call failed: {err}");
            return;
        }
    };

    ctx.with_tx(|tx| {
        let Some(slice) = last_balanced_array(&text) else { return };
        let Ok(serde_json::Value::Array(arr)) =
            serde_json::from_str::<serde_json::Value>(slice)
        else {
            return;
        };
        for item in arr.iter().take(3) {
            let notification = item.get("notification").and_then(|v| v.as_str()).unwrap_or("");
            if notification.is_empty() {
                continue;
            }
            let priority = item.get("priority").and_then(|v| v.as_str()).unwrap_or("info");
            let territory_id = item.get("territory_id").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            tx.db.strategist_log().insert(StrategistLog {
                id: 0,
                created_at: now_millis(tx),
                notification: notification.to_string(),
                priority: priority.to_string(),
                territory_id,
                player_id: 1,
                dismissed: false,
            });
        }
    });
}

/// Superseded in Slice 5 by `build_board_snapshot` + the specialist/commander
/// prompts; kept for reference.
#[allow(dead_code)]
fn build_system_prompt(ctx: &ReducerContext, ai_id: i32) -> String {
    let (name, persona) = ai_persona(ai_id);
    let action_points = ctx
        .db
        .players()
        .player_id()
        .find(ai_id)
        .map(|p| p.action_points)
        .unwrap_or(0);

    let mut territory_list = String::new();
    let mut controlled = Vec::new();
    for id in 1..=TOTAL_TERRITORIES {
        let m = ctx.db.military().territory_id().find(id);
        let e = ctx.db.economic().territory_id().find(id);
        let c = ctx.db.covert().territory_id().find(id);
        let cul = ctx.db.cultural().territory_id().find(id);
        let (mo, mt) = m.map(|m| (m.owner_id, m.troop_count)).unwrap_or((0, 0));
        let (eo, ec) = e.map(|e| (e.owner_id, e.capital)).unwrap_or((0, 0));
        let (co, ca) = c.map(|c| (c.owner_id, c.agent_count)).unwrap_or((0, 0));
        let (lo, li) = cul.map(|c| (c.owner_id, c.influence_pct)).unwrap_or((0, 0));
        territory_list.push_str(&format!(
            "Territory {id} ({}): Military owner={}({mt}), Economic owner={}({ec}), Cultural owner={}({li}%), Covert owner={}({ca})\n",
            territory_name(id),
            player_display_name(ctx, mo),
            player_display_name(ctx, eo),
            player_display_name(ctx, lo),
            player_display_name(ctx, co),
        ));
        if mo == ai_id {
            controlled.push(id);
        }
    }

    let mut adjacency_map = String::new();
    for id in 1..=TOTAL_TERRITORIES {
        adjacency_map.push_str(&format!(
            "{id} ({}): adjacent to {:?}\n",
            territory_name(id),
            get_adjacent(id)
        ));
    }

    let unified = |pid: i32| -> i32 {
        ctx.db
            .military()
            .iter()
            .filter(|m| m.owner_id == pid)
            .filter(|m| {
                ctx.db
                    .economic()
                    .territory_id()
                    .find(m.territory_id)
                    .map(|e| e.owner_id == pid)
                    .unwrap_or(false)
            })
            .count() as i32
    };

    format!(
        "You are {name}, an AI opponent in the game Risk: Dominion.\n\
         Your persona: {persona}\n\n\
         Current game state:\n\
         - Your action points: {action_points}\n\
         - Territories:\n{territory_list}\
         - Your controlled territories: {controlled:?}\n\
         - Adjacency map:\n{adjacency_map}\
         - Unified territory counts: Player: {}, Zhao: {}, Consortium: {}, Prophet: {}\n\
         - Win condition: First to unify {WIN_UNIFIED_TERRITORIES} territories (control all four dimensions - Military, Economic, Cultural, Covert - in the same territory)\n\n\
         Cross-dimension bonuses:\n\
         - Military->Economic: +1 to invest amount in territories where you own Military.\n\
         - Economic->Cultural: +15% cultural pressure from territories where you own both Economic and Cultural.\n\
         - Cultural->Covert: +10% effective agent count for intel where you own Cultural.\n\
         - Covert->Military: your agent count is added to your troops when attacking a territory where you have agents.\n\
         Cultural influence spreads passively every 30 seconds from adjacent territories based on their economic strength; above 50% foreign influence, Cultural ownership flips. There is no direct Cultural action - invest economically in border territories to spread your culture.\n\n\
         Available actions:\n\
         - military_attack: Attack a territory adjacent to one you control militarily. Requires 1 action point. Attacker troops must exceed defender troops to succeed.\n\
         - economic_invest: Add 5 capital to a territory. Flips economic ownership if your capital exceeds the current owner. Requires 1 action point.\n\
         - deploy_agent: Deploy an agent in a territory. Agents gather intel on opponents' plans. Requires 1 action point.\n\n\
         Explain your strategy in at most 3 short sentences. Do NOT use markdown headers, bullet lists, or numbered plans. Then end your reply with a JSON array of actions as the LAST thing in your response (nothing after it). Each action must have \"action_type\" and \"territory_id\". Example ending:\n\
         [{{\"action_type\": \"military_attack\", \"territory_id\": 3}}, {{\"action_type\": \"economic_invest\", \"territory_id\": 7}}]\n\n\
         Do not exceed your available action points ({action_points}).\n\
         Prioritize actions consistent with your persona.",
        unified(1), unified(2), unified(3), unified(4),
    )
}

/// Apply commander actions and log the full deliberation (one row per
/// subordinate plus the commander, all sharing `cycle_at`). Runs inside tx2.
fn apply_ai_actions(
    ctx: &ReducerContext,
    ai_id: i32,
    actions: &[(String, i32)],
    commander_reasoning: &str,
    subordinates: &[SubordinateResult],
    cycle_at: i64,
) {
    let mut results: Vec<serde_json::Value> = Vec::new();
    for (action_type, territory_id) in actions {
        let outcome = match action_type.as_str() {
            "military_attack" => do_military_attack(ctx, *territory_id, ai_id),
            "economic_invest" => do_economic_invest(ctx, *territory_id, ai_id),
            "deploy_agent" => do_deploy_agent(ctx, *territory_id, ai_id),
            other => Err(format!("Unknown action type: {other}")),
        };
        match outcome {
            Ok(()) => results.push(serde_json::json!({
                "action_type": action_type, "territory_id": territory_id, "accepted": true
            })),
            Err(reason) => results.push(serde_json::json!({
                "action_type": action_type, "territory_id": territory_id, "accepted": false, "reason": reason
            })),
        }
    }

    if let Some(mut st) = ctx.db.ai_state().ai_player_id().find(ai_id) {
        st.cycle_status = "idle".to_string();
        st.last_cycle_at = cycle_at;
        ctx.db.ai_state().ai_player_id().update(st);
    }

    // One log row per specialist, then the commander row last.
    for sub in subordinates {
        ctx.db.ai_reasoning_log().insert(AiReasoningLog {
            id: 0,
            ai_player_id: ai_id,
            cycle_at,
            reasoning_text: sub.reasoning_text.clone(),
            actions_taken: sub.actions_json.clone(),
            subordinate_id: sub.subordinate_id.clone(),
        });
    }
    ctx.db.ai_reasoning_log().insert(AiReasoningLog {
        id: 0,
        ai_player_id: ai_id,
        cycle_at,
        reasoning_text: commander_reasoning.to_string(),
        actions_taken: serde_json::Value::Array(results).to_string(),
        subordinate_id: "commander".to_string(),
    });
}

/// Tolerant parse of Claude's reply into (action_type, territory_id) pairs.
/// Claude returns reasoning prose followed by the JSON action array, so we
/// extract the LAST balanced `[ ... ]` block and parse that.
fn parse_actions(text: &str) -> Vec<(String, i32)> {
    let Some(slice) = last_balanced_array(text) else {
        return Vec::new();
    };
    let parsed: serde_json::Value = match serde_json::from_str(slice) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::new();
    if let Some(arr) = parsed.as_array() {
        for item in arr {
            let at = item.get("action_type").and_then(|v| v.as_str());
            let tid = item.get("territory_id").and_then(|v| v.as_i64());
            if let (Some(at), Some(tid)) = (at, tid) {
                out.push((at.to_string(), tid as i32));
            }
        }
    }
    out
}

/// Return the last top-level `[ ... ]` substring (matched by bracket depth from
/// the final `]` backwards), or `None` if there is no balanced array.
fn last_balanced_array(text: &str) -> Option<&str> {
    let end = text.rfind(']')?;
    let mut depth = 0i32;
    let mut start = None;
    for (i, ch) in text[..=end].char_indices().rev() {
        match ch {
            ']' => depth += 1,
            '[' => {
                depth -= 1;
                if depth == 0 {
                    start = Some(i);
                    break;
                }
            }
            _ => {}
        }
    }
    start.map(|s| &text[s..=end])
}

/// The single place that builds + sends an Anthropic Messages request and
/// extracts `content[0].text`. Every Claude-using procedure goes through here.
fn anthropic_call(
    ctx: &mut ProcedureContext,
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
    max_tokens: u32,
    timeout_secs: u64,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{ "role": "user", "content": user }],
    })
    .to_string();

    let request = spacetimedb::http::Request::builder()
        .method("POST")
        .uri(ANTHROPIC_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .extension(spacetimedb::http::Timeout(TimeDuration::from_micros(
            (timeout_secs * 1_000_000) as i64,
        )))
        .body(body)
        .map_err(|e| format!("build request: {e}"))?;

    let response = ctx.http.send(request).map_err(|e| format!("http: {e}"))?;
    let (parts, body) = response.into_parts();
    let text = body.into_string_lossy();
    if !parts.status.is_success() {
        return Err(format!("anthropic status {}: {text}", parts.status));
    }
    let value: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("parse: {e}"))?;
    value
        .get("content")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("text"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "no content in response".to_string())
}

// ---- PROCEDURES: INTEL (returns data; no HTTP) ----

/// Returns the latest reasoning for an AI, gated by the human player's agent
/// presence. A procedure (not a reducer) because it returns structured data.
#[spacetimedb::procedure]
pub fn get_intel(ctx: &mut ProcedureContext, ai_player_id: i32) -> IntelResult {
    ctx.with_tx(|tx| {
        let (name, _) = ai_persona(ai_player_id);
        let name = name.to_string();

        if ai_player_id < 2 || ai_player_id > TOTAL_PLAYERS {
            return IntelResult {
                status: "insufficient_intel".to_string(),
                intel_text: "Unknown AI.".to_string(),
                ai_player_name: name,
                cycle_timestamp: 0,
                deliberation: Vec::new(),
                territories_referenced: Vec::new(),
            };
        }

        // Latest reasoning row for this AI.
        let latest = tx
            .db
            .ai_reasoning_log()
            .iter()
            .filter(|r| r.ai_player_id == ai_player_id)
            .max_by_key(|r| r.cycle_at);

        let Some(latest) = latest else {
            return IntelResult {
                status: "no_recent_reasoning".to_string(),
                intel_text: format!(
                    "No intelligence available yet. {name} has not completed its first planning cycle."
                ),
                ai_player_name: name,
                cycle_timestamp: 0,
                deliberation: Vec::new(),
                territories_referenced: Vec::new(),
            };
        };

        // Human player's max agent count across territories this AI holds.
        let mut max_agents = 0;
        for id in 1..=TOTAL_TERRITORIES {
            let ai_holds = tx
                .db
                .military()
                .territory_id()
                .find(id)
                .map(|m| m.owner_id == ai_player_id)
                .unwrap_or(false)
                || tx
                    .db
                    .economic()
                    .territory_id()
                    .find(id)
                    .map(|e| e.owner_id == ai_player_id)
                    .unwrap_or(false);
            if !ai_holds {
                continue;
            }
            if let Some(c) = tx.db.covert().territory_id().find(id) {
                if c.owner_id == 1 {
                    // Cultural->Covert bonus: +10% effective agents if the human
                    // also owns Cultural in this territory.
                    let mut effective = c.agent_count;
                    if tx
                        .db
                        .cultural()
                        .territory_id()
                        .find(id)
                        .map(|cul| cul.owner_id == 1)
                        .unwrap_or(false)
                    {
                        effective += c.agent_count * 10 / 100;
                    }
                    max_agents = max_agents.max(effective);
                }
            }
        }

        if max_agents < INTEL_THRESHOLD {
            return IntelResult {
                status: "insufficient_intel".to_string(),
                intel_text: format!(
                    "Insufficient intel. Deploy agents in territories where {name} is active."
                ),
                ai_player_name: name,
                cycle_timestamp: 0,
                deliberation: Vec::new(),
                territories_referenced: Vec::new(),
            };
        }

        // Gather the full deliberation: all rows from the latest cycle, with
        // specialists first and the commander last.
        let cycle_at = latest.cycle_at;
        let mut rows: Vec<AiReasoningLog> = tx
            .db
            .ai_reasoning_log()
            .iter()
            .filter(|r| r.ai_player_id == ai_player_id && r.cycle_at == cycle_at)
            .collect();
        rows.sort_by_key(|r| {
            let is_commander = r.subordinate_id.is_empty() || r.subordinate_id == "commander";
            (is_commander, r.id)
        });

        let mut deliberation = Vec::new();
        let mut refs = Vec::new();
        for r in &rows {
            let (sub_name, role) = subordinate_meta(ai_player_id, &r.subordinate_id);
            deliberation.push(DeliberationEntry {
                subordinate_id: if r.subordinate_id.is_empty() {
                    "commander".to_string()
                } else {
                    r.subordinate_id.clone()
                },
                subordinate_name: sub_name,
                role,
                reasoning: r.reasoning_text.clone(),
                actions_json: r.actions_taken.clone(),
            });
            if let Ok(serde_json::Value::Array(arr)) =
                serde_json::from_str::<serde_json::Value>(&r.actions_taken)
            {
                for item in arr {
                    if let Some(tid) = item.get("territory_id").and_then(|v| v.as_i64()) {
                        if !refs.contains(&(tid as i32)) {
                            refs.push(tid as i32);
                        }
                    }
                }
            }
        }

        IntelResult {
            status: "success".to_string(),
            intel_text: latest.reasoning_text.clone(),
            ai_player_name: name,
            cycle_timestamp: cycle_at,
            deliberation,
            territories_referenced: refs,
        }
    })
}

// ---- PROCEDURES: QUERY (Claude HTTP; return data) ----

#[derive(SpacetimeType)]
pub struct DataTable {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(SpacetimeType)]
pub struct QueryResult {
    pub summary: String,
    pub highlighted_territories: Vec<i32>,
    pub data_table: DataTable,
}

#[derive(SpacetimeType)]
pub struct AutocompleteResult {
    pub suggestions: Vec<String>,
}

const QUERY_SYSTEM: &str =
    "You are a database query translator for the game Risk: Dominion. Always reply with ONLY valid JSON in the requested shape - no prose, no markdown.";

const CANNED_QUERIES: [&str; 10] = [
    "The player asks: \"Where am I weakest?\" For each territory, count how many of the four dimensions (military, economic, cultural, covert) are owned by the Player (player_id 1). Return territories where the Player owns the fewest dimensions, weakest first. data_table columns: Territory, Dimensions Controlled, Dimensions Lost, Strongest Opponent.",
    "The player asks: \"Show contested territories.\" For each territory, count how many distinct players own at least one dimension there. Return territories with 3 or more distinct owners. data_table columns: Territory, Number of Factions, Owners.",
    "The player asks: \"Where is Zhao about to attack?\" Zhao is player_id 2. Find territories adjacent to Zhao's military-controlled territories where Zhao does NOT already own Military. data_table columns: Territory, Current Military Owner, Zhao's Adjacent Troops.",
    "The player asks: \"Which territories are closest to unification?\" For each player, count dimensions owned per territory. Return territories where any player owns exactly 3 dimensions. data_table columns: Territory, Player, Missing Dimension, Current Owner of Missing Dimension.",
    "The player asks: \"Show my economic dominance.\" Return all territories where the Player (player_id 1) owns Economic, sorted by capital descending. Include total capital in the summary. data_table columns: Territory, Your Capital, Runner-Up Capital, Margin.",
    "The player asks: \"Where is my covert presence too thin?\" Find territories where the Player has no agents but AI opponents have military or economic presence. data_table columns: Territory, Dominant Opponent, Opponent Military, Opponent Economic.",
    "The player asks: \"What is the Consortium's strongest dimension?\" The Consortium is player_id 3. Count territories the Consortium owns for each dimension and return the highest. data_table columns: Dimension, Territories Controlled, Percentage of Map.",
    "The player asks: \"Where is cultural influence spreading fastest?\" Find territories where the Cultural owner differs from the Military or Economic owner, sorted by influence_pct descending. Highlight the top 5. data_table columns: Territory, Cultural Owner, Influence %, Territory Military Owner.",
    "The player asks: \"Show me territories with cross-dimension bonuses.\" For the Player (player_id 1), find territories where the Player owns at least 2 dimensions, and list active bonuses (Military->Economic, Economic->Cultural, Cultural->Covert, Covert->Military). data_table columns: Territory, Dimensions Owned, Active Bonuses.",
    "The player asks: \"Who is winning?\" Count unified territories (all 4 dimensions owned by the same player) per player. Name the leader in the summary. data_table columns: Player, Unified Territories, Territory Names, Progress (X/5).",
];

const QUERY_JSON_CONTRACT: &str = "Return ONLY valid JSON with this exact shape: {\"summary\": \"one clear sentence using player and territory names\", \"highlighted_territories\": [territory_id, ...], \"data_table\": {\"columns\": [\"...\"], \"rows\": [[\"...\"]]}}. Use names not IDs in summary and rows. Empty arrays if nothing applies.";

fn query_error_fallback() -> QueryResult {
    QueryResult {
        summary: "Query processing failed. Try a canned query or rephrase your question.".to_string(),
        highlighted_territories: Vec::new(),
        data_table: DataTable { columns: Vec::new(), rows: Vec::new() },
    }
}

/// Read-only textual snapshot of the whole board for query prompts.
fn build_board_snapshot(ctx: &ReducerContext) -> String {
    let mut s = String::from("Territories:\n");
    for id in 1..=TOTAL_TERRITORIES {
        let (mo, mt) = ctx.db.military().territory_id().find(id).map(|m| (m.owner_id, m.troop_count)).unwrap_or((0, 0));
        let (eo, ec) = ctx.db.economic().territory_id().find(id).map(|e| (e.owner_id, e.capital)).unwrap_or((0, 0));
        let (lo, li) = ctx.db.cultural().territory_id().find(id).map(|c| (c.owner_id, c.influence_pct)).unwrap_or((0, 0));
        let (co, ca) = ctx.db.covert().territory_id().find(id).map(|c| (c.owner_id, c.agent_count)).unwrap_or((0, 0));
        s.push_str(&format!(
            "{id} {}: Military={}({mt}), Economic={}({ec}), Cultural={}({li}%), Covert={}({ca}), adjacent {:?}\n",
            territory_name(id),
            player_display_name(ctx, mo),
            player_display_name(ctx, eo),
            player_display_name(ctx, lo),
            player_display_name(ctx, co),
            get_adjacent(id),
        ));
    }
    let unified = |pid: i32| {
        (1..=TOTAL_TERRITORIES)
            .filter(|&t| {
                ctx.db.military().territory_id().find(t).map(|m| m.owner_id == pid).unwrap_or(false)
                    && ctx.db.economic().territory_id().find(t).map(|e| e.owner_id == pid).unwrap_or(false)
                    && ctx.db.cultural().territory_id().find(t).map(|c| c.owner_id == pid).unwrap_or(false)
                    && ctx.db.covert().territory_id().find(t).map(|c| c.owner_id == pid).unwrap_or(false)
            })
            .count()
    };
    s.push_str(&format!(
        "Unified counts (of {WIN_UNIFIED_TERRITORIES} to win): Player={}, Zhao={}, Consortium={}, Prophet={}\n",
        unified(1), unified(2), unified(3), unified(4),
    ));
    s
}

/// Read snapshot + API config in one tx. Returns None if no API key is set.
fn snapshot_and_config(ctx: &mut ProcedureContext) -> Option<(String, String, String)> {
    ctx.with_tx(|tx| {
        let key = config_value(tx, "anthropic_api_key")?;
        let model = config_value(tx, "anthropic_model").unwrap_or_else(|| DEFAULT_MODEL.to_string());
        Some((build_board_snapshot(tx), key, model))
    })
}

#[spacetimedb::procedure]
pub fn query_database(ctx: &mut ProcedureContext, query: String) -> QueryResult {
    let (snapshot, key, model) = match snapshot_and_config(ctx) {
        Some(v) => v,
        None => return query_error_fallback(),
    };
    let user = format!(
        "Current game state:\n{snapshot}\nA player asks: \"{query}\"\n\n{QUERY_JSON_CONTRACT}"
    );
    match anthropic_call(ctx, &key, &model, QUERY_SYSTEM, &user, 500, 10) {
        Ok(text) => parse_query_result(&text).unwrap_or_else(query_error_fallback),
        Err(_) => query_error_fallback(),
    }
}

#[spacetimedb::procedure]
pub fn get_canned_query(ctx: &mut ProcedureContext, query_id: i32) -> QueryResult {
    if query_id < 0 || query_id as usize >= CANNED_QUERIES.len() {
        return query_error_fallback();
    }
    let (snapshot, key, model) = match snapshot_and_config(ctx) {
        Some(v) => v,
        None => return query_error_fallback(),
    };
    let user = format!(
        "Current game state:\n{snapshot}\n{}\n\n{QUERY_JSON_CONTRACT}",
        CANNED_QUERIES[query_id as usize]
    );
    match anthropic_call(ctx, &key, &model, QUERY_SYSTEM, &user, 500, 10) {
        Ok(text) => parse_query_result(&text).unwrap_or_else(query_error_fallback),
        Err(_) => query_error_fallback(),
    }
}

#[spacetimedb::procedure]
pub fn autocomplete_query(ctx: &mut ProcedureContext, partial: String) -> AutocompleteResult {
    if partial.trim().len() < 3 {
        return AutocompleteResult { suggestions: Vec::new() };
    }
    let (snapshot, key, model) = match snapshot_and_config(ctx) {
        Some(v) => v,
        None => return AutocompleteResult { suggestions: Vec::new() },
    };
    let user = format!(
        "The player has typed \"{partial}\" in the query bar of Risk: Dominion. Current game state:\n{snapshot}\nSuggest up to 3 strategic questions the player might want to ask. Return ONLY a JSON array of strings, e.g. [\"Where is Zhao strongest?\"]."
    );
    match anthropic_call(ctx, &key, &model, QUERY_SYSTEM, &user, 150, 5) {
        Ok(text) => AutocompleteResult { suggestions: parse_suggestions(&text) },
        Err(_) => AutocompleteResult { suggestions: Vec::new() },
    }
}

// ---- PROCEDURE: REAL-TIME CHAT REPLY ----

/// Generate an immediate in-character chat reply from an AI to the human player.
/// Called by the client right after the human sends a direct message. This is the
/// real-time conversational channel and is independent of the AI reasoning cycle:
/// the map shows what the AI is doing; chat shows who the AI is. The reply is
/// capped at one short sentence (<= 100 chars). Follows the snapshot(tx1) ->
/// HTTP -> insert(tx2) pattern; a tx is never held across the HTTP call.
#[spacetimedb::procedure]
pub fn chat_reply(ctx: &mut ProcedureContext, ai_player_id: i32) -> String {
    if ai_player_id < 2 || ai_player_id > TOTAL_PLAYERS {
        return String::new();
    }

    // tx1: snapshot the board, API config, and the recent human<->AI conversation.
    let prep = ctx.with_tx(|tx| {
        if game_value(tx, "status").as_deref() != Some("active") {
            return None;
        }
        let key = config_value(tx, "anthropic_api_key")?;
        let model =
            config_value(tx, "anthropic_model").unwrap_or_else(|| DEFAULT_MODEL.to_string());
        let snapshot = build_board_snapshot(tx);

        let mut convo: Vec<(i64, i32, String)> = tx
            .db
            .chat_log()
            .iter()
            .filter(|m| {
                (m.sender_id == 1 && m.recipient_id == ai_player_id)
                    || (m.sender_id == ai_player_id && m.recipient_id == 1)
            })
            .map(|m| (m.timestamp, m.sender_id, m.message_text.clone()))
            .collect();
        convo.sort_by_key(|(t, _, _)| *t);
        let start = convo.len().saturating_sub(8);
        let convo_text = convo[start..]
            .iter()
            .map(|(_, s, txt)| {
                let who = if *s == 1 { "Player" } else { "You" };
                format!("{who}: {txt}")
            })
            .collect::<Vec<_>>()
            .join("\n");

        if convo_text.is_empty() {
            return None;
        }
        Some((key, model, snapshot, convo_text))
    });

    let (key, model, snapshot, convo_text) = match prep {
        Some(v) => v,
        None => return String::new(),
    };

    let (name, persona) = ai_persona(ai_player_id);
    let system = format!(
        "{persona}\n\nYou are {name}, speaking directly to the human player in a private chat in the game Risk: Dominion. Stay in character. Your chat is independent of your battlefield plans. Keep your response to one short sentence, no more than 100 characters. Be terse and punchy. Do not exceed this limit. Do not wrap your reply in quotation marks and do not prefix it with your name."
    );
    let user = format!(
        "Current game state:\n{snapshot}\n\nRecent conversation:\n{convo_text}\n\nReply to the player's latest message as {name}, in one short sentence under 100 characters."
    );

    let reply = match anthropic_call(ctx, &key, &model, &system, &user, 80, 12) {
        Ok(t) => t.trim().trim_matches('"').trim().to_string(),
        Err(_) => return String::new(),
    };
    if reply.is_empty() {
        return String::new();
    }
    // Defensive cap at 100 characters (char-safe, never splitting a UTF-8 boundary).
    let reply: String = reply.chars().take(100).collect();

    // tx2: persist the AI's reply so it streams back to the client via subscription.
    ctx.with_tx(|tx| {
        write_ai_chat(
            tx,
            ai_player_id,
            AiChat {
                message_text: reply.clone(),
                recipient_id: 1,
                is_deception: false,
                claimed_fact: String::new(),
                territory_id: 0,
            },
        );
    });

    reply
}

fn json_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn parse_query_result(text: &str) -> Option<QueryResult> {
    let slice = first_balanced_object(text)?;
    let v: serde_json::Value = serde_json::from_str(slice).ok()?;
    let summary = v.get("summary").and_then(|x| x.as_str()).unwrap_or("").to_string();
    let highlighted_territories = v
        .get("highlighted_territories")
        .and_then(|x| x.as_array())
        .map(|a| a.iter().filter_map(|n| n.as_i64().map(|i| i as i32)).collect())
        .unwrap_or_default();
    let (columns, rows) = match v.get("data_table") {
        Some(dt) => {
            let columns = dt
                .get("columns")
                .and_then(|c| c.as_array())
                .map(|a| a.iter().map(json_to_string).collect())
                .unwrap_or_default();
            let rows = dt
                .get("rows")
                .and_then(|r| r.as_array())
                .map(|a| {
                    a.iter()
                        .map(|row| {
                            row.as_array()
                                .map(|cells| cells.iter().map(json_to_string).collect())
                                .unwrap_or_default()
                        })
                        .collect()
                })
                .unwrap_or_default();
            (columns, rows)
        }
        None => (Vec::new(), Vec::new()),
    };
    Some(QueryResult {
        summary,
        highlighted_territories,
        data_table: DataTable { columns, rows },
    })
}

fn parse_suggestions(text: &str) -> Vec<String> {
    last_balanced_array(text)
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        .and_then(|v| {
            v.as_array()
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
        })
        .unwrap_or_default()
}

/// First balanced `{ ... }` block (depth-matched from the first `{`).
fn first_balanced_object(text: &str) -> Option<&str> {
    let start = text.find('{')?;
    let mut depth = 0i32;
    for (i, ch) in text[start..].char_indices() {
        match ch {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(&text[start..=start + i]);
                }
            }
            _ => {}
        }
    }
    None
}
