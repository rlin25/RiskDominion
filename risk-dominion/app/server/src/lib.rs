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
const ACTION_REGEN_SECONDS: u64 = 8;
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
const INTEL_THRESHOLD: i32 = 3;

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

// ---- PROCEDURE RETURN TYPES ----

#[derive(SpacetimeType)]
pub struct IntelResult {
    pub status: String, // "success" | "insufficient_intel" | "no_recent_reasoning"
    pub intel_text: String,
    pub ai_player_name: String,
    pub cycle_timestamp: i64,
    pub territories_referenced: Vec<i32>,
}

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
#[spacetimedb::reducer]
pub fn start_game(ctx: &ReducerContext) -> Result<(), String> {
    if game_value(ctx, "status").is_some() {
        return Ok(());
    }

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

    // Territory seed: (id, mil_owner, mil_troops, eco_owner, eco_capital, cov_owner,
    // cov_agents, cul_owner, cul_influence).
    let seed: [(i32, i32, i32, i32, i32, i32, i32, i32, i32); 12] = [
        (1, 1, 10, 1, 20, 1, 1, 1, 0),
        (2, 1, 5, 3, 8, 0, 0, 1, 30),
        (3, 1, 4, 1, 6, 0, 0, 4, 25),
        (4, 2, 6, 1, 10, 0, 0, 1, 35),
        (5, 3, 10, 3, 20, 3, 1, 3, 0),
        (6, 3, 5, 3, 10, 0, 0, 4, 40),
        (7, 3, 4, 3, 7, 0, 0, 4, 20),
        (8, 2, 5, 3, 9, 0, 0, 4, 30),
        (9, 4, 10, 4, 20, 4, 1, 4, 0),
        (10, 2, 5, 4, 8, 0, 0, 2, 35),
        (11, 2, 10, 2, 20, 2, 1, 2, 0),
        (12, 4, 4, 4, 7, 0, 0, 2, 25),
    ];
    for (territory_id, mo, mt, eo, ec, co, ca, cul_o, cul_i) in seed {
        ctx.db.military().insert(Military { territory_id, owner_id: mo, troop_count: mt });
        ctx.db.economic().insert(Economic { territory_id, owner_id: eo, capital: ec });
        ctx.db.covert().insert(Covert { territory_id, owner_id: co, agent_count: ca });
        ctx.db.cultural().insert(Cultural { territory_id, owner_id: cul_o, influence_pct: cul_i });
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

    log::info!("Game started: {TOTAL_PLAYERS} players, {TOTAL_TERRITORIES} territories seeded.");
    Ok(())
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

    player.action_points -= 1;
    ctx.db.players().player_id().update(player);

    if attacker_troops > defender_troops {
        target.owner_id = player_id;
        target.troop_count = (attacker_troops - defender_troops).max(MIN_TROOPS);
        ctx.db.military().territory_id().update(target);
        dimension_owner_change(ctx, player_id);
    } else {
        target.troop_count = (defender_troops - (attacker_troops / 2)).max(MIN_TROOPS);
        ctx.db.military().territory_id().update(target);
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
    let flipped = player_id != current_owner;
    if flipped {
        target.owner_id = player_id;
    }
    ctx.db.economic().territory_id().update(target);

    if flipped {
        dimension_owner_change(ctx, player_id);
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

    if flipped {
        dimension_owner_change(ctx, player_id);
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

// ---- INTERNAL: WIN CHECK ----

/// Re-evaluate the win condition after an ownership flip. Covert does NOT count
/// toward unification (only Military + Economic). Runs in the caller's tx.
fn dimension_owner_change(ctx: &ReducerContext, new_owner: i32) {
    // Unification requires the same owner across ALL FOUR dimensions (Slice 3+).
    let owns = |table_owner: Option<i32>| table_owner == Some(new_owner);
    let unified = ctx
        .db
        .military()
        .iter()
        .filter(|m| m.owner_id == new_owner)
        .filter(|m| {
            let eco = owns(ctx.db.economic().territory_id().find(m.territory_id).map(|e| e.owner_id));
            let cul = owns(ctx.db.cultural().territory_id().find(m.territory_id).map(|c| c.owner_id));
            let cov = owns(ctx.db.covert().territory_id().find(m.territory_id).map(|c| c.owner_id));
            eco && cul && cov
        })
        .count() as i32;

    if unified >= WIN_UNIFIED_TERRITORIES {
        let winner_name = player_display_name(ctx, new_owner);
        set_game_value(ctx, "status", "ended");
        set_game_value(ctx, "winner", &winner_name);
        log::info!("Game over: {winner_name} unified {unified} territories.");
    }
}

// ---- SCHEDULED REDUCERS ----

#[spacetimedb::reducer]
pub fn regenerate_action_points(ctx: &ReducerContext, _timer: RegenTimer) {
    let ts = now_millis(ctx);
    let players: Vec<Player> = ctx.db.players().iter().collect();
    for mut player in players {
        if player.action_points < MAX_ACTION_POINTS {
            player.action_points += 1;
            player.last_regen_at = ts;
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
            dimension_owner_change(ctx, best_player);
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
    let plan: Option<(String, String, String)> = ctx.with_tx(|tx| {
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

        // Mark pending + record schedule.
        let mut st = state;
        st.cycle_status = "pending".to_string();
        st.next_cycle_at = now_millis_ts(next_at);
        tx.db.ai_state().ai_player_id().update(st);

        Some((build_system_prompt(tx, ai_id), api_key, model))
    });

    let (system_prompt, api_key, model) = match plan {
        Some(p) => p,
        None => return,
    };

    let result = anthropic_call(
        ctx,
        &api_key,
        &model,
        &system_prompt,
        "Decide your moves for this turn. End with the JSON action array.",
        AI_MAX_TOKENS,
        AI_LLM_TIMEOUT_SECONDS,
    );

    // tx2: apply actions + log + return to idle.
    ctx.with_tx(|tx| {
        match &result {
            Ok(text) => {
                let actions = parse_actions(text);
                apply_ai_actions(tx, ai_id, &actions, text);
            }
            Err(err) => {
                log::error!("AI {ai_id} Claude call failed: {err}");
                if let Some(mut st) = tx.db.ai_state().ai_player_id().find(ai_id) {
                    st.cycle_status = "idle".to_string();
                    tx.db.ai_state().ai_player_id().update(st);
                }
            }
        }
    });
}

/// Build the per-AI system prompt from a live snapshot of the board.
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

/// Apply the AI's chosen actions (within tx2), log reasoning, return to idle.
fn apply_ai_actions(ctx: &ReducerContext, ai_id: i32, actions: &[(String, i32)], reasoning: &str) {
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

    let ts = now_millis(ctx);
    if let Some(mut st) = ctx.db.ai_state().ai_player_id().find(ai_id) {
        st.cycle_status = "idle".to_string();
        st.last_cycle_at = ts;
        ctx.db.ai_state().ai_player_id().update(st);
    }
    ctx.db.ai_reasoning_log().insert(AiReasoningLog {
        id: 0,
        ai_player_id: ai_id,
        cycle_at: ts,
        reasoning_text: reasoning.to_string(),
        actions_taken: serde_json::Value::Array(results).to_string(),
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
                territories_referenced: Vec::new(),
            };
        }

        // Collect referenced territory ids from the logged actions.
        let mut refs = Vec::new();
        if let Ok(serde_json::Value::Array(arr)) =
            serde_json::from_str::<serde_json::Value>(&latest.actions_taken)
        {
            for item in arr {
                if let Some(tid) = item.get("territory_id").and_then(|v| v.as_i64()) {
                    refs.push(tid as i32);
                }
            }
        }

        IntelResult {
            status: "success".to_string(),
            intel_text: latest.reasoning_text.clone(),
            ai_player_name: name,
            cycle_timestamp: latest.cycle_at,
            territories_referenced: refs,
        }
    })
}
