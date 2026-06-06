//! Risk: Dominion — SpacetimeDB server module.
//!
//! Single-file module organized by section. Reducers are deterministic and
//! return `Result<(), String>` (clients observe outcomes via subscriptions, not
//! return values). External/LLM work is added in later slices via *procedures*
//! (the only function type allowed to make HTTP calls); reducers never do.
//!
//! Slice 1: two players, two dimensions (Military, Economic), core gameplay.

use spacetimedb::{ReducerContext, ScheduleAt, Table};

// ---- CONSTANTS ----

const MAX_ACTION_POINTS: i32 = 10;
const ACTION_REGEN_SECONDS: u64 = 8;
const STARTING_ACTION_POINTS: i32 = 5;
const ECONOMIC_INVEST_AMOUNT: i32 = 5;
const WIN_UNIFIED_TERRITORIES: i32 = 3;
const TOTAL_TERRITORIES: i32 = 12;
const MIN_TROOPS: i32 = 1;

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

#[spacetimedb::table(accessor = players, public)]
pub struct Player {
    #[primary_key]
    pub player_id: i32,
    pub player_name: String,
    pub color: String,
    pub action_points: i32,
    pub last_regen_at: i64,
}

#[spacetimedb::table(accessor = game_state, public)]
pub struct GameState {
    #[primary_key]
    pub key: String,
    pub value: String,
}

// ---- SCHEDULED TABLES ----

/// Drives `regenerate_action_points` on a fixed interval. One row, armed in
/// `start_game`. The scheduled reducer receives the row each tick.
#[spacetimedb::table(accessor = regen_timer, scheduled(regenerate_action_points))]
pub struct RegenTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

// ---- ADJACENCY ----

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

// ---- HELPERS ----

/// Current server time in milliseconds since the Unix epoch (deterministic).
fn now_millis(ctx: &ReducerContext) -> i64 {
    ctx.timestamp.to_micros_since_unix_epoch() / 1000
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

// ---- REDUCERS: START GAME ----

/// Seed the board. Idempotent: if a game already exists, returns immediately.
/// Called by the client on load (whichever player connects first).
#[spacetimedb::reducer]
pub fn start_game(ctx: &ReducerContext) -> Result<(), String> {
    if game_value(ctx, "status").is_some() {
        return Ok(());
    }

    let ts = now_millis(ctx);

    // Players (1 human blue, 1 human red).
    ctx.db.players().insert(Player {
        player_id: 1,
        player_name: "Player 1".to_string(),
        color: "#4488FF".to_string(),
        action_points: STARTING_ACTION_POINTS,
        last_regen_at: ts,
    });
    ctx.db.players().insert(Player {
        player_id: 2,
        player_name: "Player 2".to_string(),
        color: "#FF4444".to_string(),
        action_points: STARTING_ACTION_POINTS,
        last_regen_at: ts,
    });

    // Game state.
    set_game_value(ctx, "status", "active");
    set_game_value(ctx, "winner", "");
    set_game_value(ctx, "started_at", &ts.to_string());

    // Seed territories: (territory_id, mil_owner, mil_troops, eco_owner, eco_capital).
    let seed: [(i32, i32, i32, i32, i32); 12] = [
        (1, 1, 10, 1, 20),
        (2, 1, 5, 2, 8),
        (3, 1, 4, 1, 6),
        (4, 2, 6, 1, 10),
        (5, 2, 10, 2, 20),
        (6, 2, 5, 1, 8),
        (7, 2, 4, 2, 7),
        (8, 1, 5, 2, 9),
        (9, 2, 6, 1, 8),
        (10, 1, 5, 2, 10),
        (11, 2, 8, 2, 15),
        (12, 1, 4, 1, 7),
    ];
    for (territory_id, mil_owner, mil_troops, eco_owner, eco_capital) in seed {
        ctx.db.military().insert(Military {
            territory_id,
            owner_id: mil_owner,
            troop_count: mil_troops,
        });
        ctx.db.economic().insert(Economic {
            territory_id,
            owner_id: eco_owner,
            capital: eco_capital,
        });
    }

    // Arm the action-point regeneration timer.
    ctx.db.regen_timer().insert(RegenTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(
            std::time::Duration::from_secs(ACTION_REGEN_SECONDS).into(),
        ),
    });

    log::info!("Game started: {TOTAL_TERRITORIES} territories seeded.");
    Ok(())
}

// ---- REDUCERS: PLAYER ACTIONS ----

/// Drag a Military card onto an adjacent enemy/neutral territory.
#[spacetimedb::reducer]
pub fn military_attack(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    if !game_is_active(ctx) {
        return Err("Game has ended.".to_string());
    }
    if player_id != 1 && player_id != 2 {
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

    // Highest troop count among the player's military in territories adjacent to the target.
    let attacker_troops = get_adjacent(territory_id)
        .into_iter()
        .filter_map(|adj| ctx.db.military().territory_id().find(adj))
        .filter(|m| m.owner_id == player_id)
        .map(|m| m.troop_count)
        .max();
    let attacker_troops = match attacker_troops {
        Some(t) => t,
        None => return Err("No adjacent territory controlled.".to_string()),
    };

    let mut target = ctx
        .db
        .military()
        .territory_id()
        .find(territory_id)
        .ok_or("Invalid territory.".to_string())?;
    let defender_troops = target.troop_count;

    // Spend the action point.
    player.action_points -= 1;
    ctx.db.players().player_id().update(player);

    if attacker_troops > defender_troops {
        target.owner_id = player_id;
        target.troop_count = (attacker_troops - defender_troops).max(MIN_TROOPS);
        ctx.db.military().territory_id().update(target);
        dimension_owner_change(ctx, territory_id, player_id);
    } else {
        target.troop_count = (defender_troops - (attacker_troops / 2)).max(MIN_TROOPS);
        ctx.db.military().territory_id().update(target);
    }

    Ok(())
}

/// Drag an Economic card onto any territory to invest capital.
#[spacetimedb::reducer]
pub fn economic_invest(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    if !game_is_active(ctx) {
        return Err("Game has ended.".to_string());
    }
    if player_id != 1 && player_id != 2 {
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

    // Spend the action point.
    player.action_points -= 1;
    ctx.db.players().player_id().update(player);

    let current_owner = target.owner_id;
    target.capital += ECONOMIC_INVEST_AMOUNT;
    let flipped = player_id != current_owner;
    if flipped {
        // Investing in a territory you do not own makes your contribution exceed
        // the prior owner's standing capital, so ownership flips.
        target.owner_id = player_id;
    }
    ctx.db.economic().territory_id().update(target);

    if flipped {
        dimension_owner_change(ctx, territory_id, player_id);
    }

    Ok(())
}

// ---- INTERNAL FUNCTIONS ----

/// Re-evaluate the win condition after an ownership flip. Not a reducer; runs in
/// the caller's transaction. A player wins by unifying `WIN_UNIFIED_TERRITORIES`
/// territories (owning both dimensions on the same territory).
fn dimension_owner_change(ctx: &ReducerContext, _territory_id: i32, new_owner: i32) {
    let unified = ctx
        .db
        .military()
        .iter()
        .filter(|m| m.owner_id == new_owner)
        .filter(|m| {
            ctx.db
                .economic()
                .territory_id()
                .find(m.territory_id)
                .map(|e| e.owner_id == new_owner)
                .unwrap_or(false)
        })
        .count() as i32;

    if unified >= WIN_UNIFIED_TERRITORIES {
        let winner_name = ctx
            .db
            .players()
            .player_id()
            .find(new_owner)
            .map(|p| p.player_name)
            .unwrap_or_else(|| format!("Player {new_owner}"));
        set_game_value(ctx, "status", "ended");
        set_game_value(ctx, "winner", &winner_name);
        log::info!("Game over: {winner_name} unified {unified} territories.");
    }
}

// ---- SCHEDULED REDUCERS ----

/// Regenerate one action point per player every `ACTION_REGEN_SECONDS`, capped at
/// `MAX_ACTION_POINTS`. Deterministic, no external work — a scheduled *reducer*.
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
