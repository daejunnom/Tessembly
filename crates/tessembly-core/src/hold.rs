//! Small one-slot supply transition; never proves physical placement reachability.
use crate::{Error, Piece, Result};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Token {
    pub kind: Piece,
    pub origin: u64,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Slot {
    None,
    Empty,
    Occupied(Token),
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Tail {
    Pending,
    End,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HoldPolicy {
    pub allowed: bool,
    overrides: BTreeMap<Piece, bool>,
}
impl Default for HoldPolicy {
    fn default() -> Self {
        Self {
            allowed: true,
            overrides: BTreeMap::new(),
        }
    }
}
impl HoldPolicy {
    /// Advanced typed input only. No D/U/compact hold-disable shorthand.
    pub fn new(allowed: bool, rules: impl IntoIterator<Item = (Piece, bool)>) -> Result<Self> {
        let mut overrides = BTreeMap::new();
        for (piece, value) in rules {
            if overrides.insert(piece, value).is_some() {
                return Err(Error::new("DUPLICATE_HOLD_RULE"));
            }
        }
        Ok(Self { allowed, overrides })
    }
    pub fn allows(&self, active: Piece) -> bool {
        self.overrides.get(&active).copied().unwrap_or(self.allowed)
    }
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HoldState {
    pub active: Token,
    pub held: Slot,
    pub used_this_turn: bool,
    /// Future queue excludes active and held tokens. Cursor indexes this queue.
    pub queue: Vec<Token>,
    pub cursor: usize,
    pub tail: Tail,
}
impl HoldState {
    pub fn validate(&self) -> Result<()> {
        if self.cursor > self.queue.len() {
            return Err(Error::new("INVALID_CURSOR"));
        }
        let mut ids = BTreeSet::new();
        ids.insert(self.active.origin);
        if let Slot::Occupied(t) = self.held {
            if !ids.insert(t.origin) {
                return Err(Error::new("DUPLICATE_ORIGIN"));
            }
        }
        for t in &self.queue[self.cursor..] {
            if !ids.insert(t.origin) {
                return Err(Error::new("DUPLICATE_ORIGIN"));
            }
        }
        Ok(())
    }
    /// Atomic on failure. Hold lock never forbids placing the current active piece.
    pub fn swap(&mut self, policy: &HoldPolicy) -> Result<()> {
        self.validate()?;
        if self.held == Slot::None {
            return Err(Error::new("HOLD_UNAVAILABLE"));
        }
        if self.used_this_turn {
            return Err(Error::new("HOLD_USED_THIS_TURN"));
        }
        if !policy.allows(self.active.kind) {
            return Err(Error::new("HOLD_POLICY_DENIED"));
        }
        let next = match self.held {
            Slot::Occupied(t) => t,
            Slot::Empty => *self.queue.get(self.cursor).ok_or_else(|| {
                Error::new(match self.tail {
                    Tail::Pending => "NEEDS_SUPPLY",
                    Tail::End => "SUPPLY_ENDED",
                })
            })?,
            Slot::None => return Err(Error::new("HOLD_UNAVAILABLE")),
        };
        if self.held == Slot::Empty {
            self.cursor += 1;
        }
        self.held = Slot::Occupied(self.active);
        self.active = next;
        self.used_this_turn = true;
        Ok(())
    }
    /// Supply bookkeeping for a host-confirmed lock followed by a new spawn.
    /// On a terminal lock the host owns termination; it need not call this method.
    pub fn advance_after_lock(&mut self) -> Result<()> {
        self.validate()?;
        let next = *self.queue.get(self.cursor).ok_or_else(|| {
            Error::new(match self.tail {
                Tail::Pending => "NEEDS_SUPPLY",
                Tail::End => "SUPPLY_ENDED",
            })
        })?;
        self.active = next;
        self.cursor += 1;
        self.used_this_turn = false;
        Ok(())
    }
}
#[derive(Clone, Copy, Debug)]
pub struct HoldSupport {
    pub none: bool,
    pub empty: bool,
    pub occupied: bool,
}
impl HoldSupport {
    pub fn check(self, slot: Slot) -> Result<()> {
        let accepted = match slot {
            Slot::None => self.none,
            Slot::Empty => self.empty,
            Slot::Occupied(_) => self.occupied,
        };
        if accepted {
            Ok(())
        } else {
            Err(Error::new("UNSUPPORTED_STATE"))
        }
    }
}
