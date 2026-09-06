use tessembly_core::{config::Environment, hold::*, Piece};
fn tok(p: Piece, origin: u64) -> Token { Token { kind:p, origin } }
fn state(slot: Slot) -> HoldState {
    HoldState { active:tok(Piece::I,0),held:slot,used_this_turn:false,queue:vec![tok(Piece::O,2)],cursor:0,tail:Tail::End }
}
#[test] fn swap_preserves_origins_and_cursor() {
    let mut s = state(Slot::Occupied(tok(Piece::T,1)));
    s.swap(&HoldPolicy::default()).unwrap();
    assert_eq!(s.active,tok(Piece::T,1)); assert_eq!(s.held,Slot::Occupied(tok(Piece::I,0)));
    assert_eq!(s.cursor,0); assert!(s.used_this_turn);
    let saved = s.clone(); assert!(s.swap(&HoldPolicy::default()).is_err()); assert_eq!(s,saved);
    s.advance_after_lock().unwrap(); assert!(!s.used_this_turn); assert_eq!(s.active.kind,Piece::O);
}
#[test] fn empty_consumes_none_rejects() {
    let mut s = state(Slot::Empty); s.swap(&HoldPolicy::default()).unwrap(); assert_eq!(s.cursor,1);
    let mut n = state(Slot::None); let old = n.clone(); assert!(n.swap(&HoldPolicy::default()).is_err()); assert_eq!(n,old);
}
#[test] fn explicit_active_override_not_held() {
    let policy = HoldPolicy::new(true,[(Piece::I,false)]).unwrap();
    let mut s = state(Slot::Occupied(tok(Piece::T,1)));
    assert_eq!(s.swap(&policy).unwrap_err().code,"HOLD_POLICY_DENIED");
    let policy = HoldPolicy::new(true,[(Piece::T,false)]).unwrap(); s.swap(&policy).unwrap();
}
#[test] fn no_fabricated_supply() {
    let mut s = state(Slot::Empty); s.queue.clear(); s.tail = Tail::Pending;
    assert_eq!(s.swap(&HoldPolicy::default()).unwrap_err().code,"NEEDS_SUPPLY");
    s.tail = Tail::End; assert_eq!(s.swap(&HoldPolicy::default()).unwrap_err().code,"SUPPLY_ENDED");
    assert_eq!(s.held,Slot::Empty); assert_eq!(s.active.kind,Piece::I);
}
#[test] fn equal_kind_not_equal_origin() {
    let mut s = state(Slot::Occupied(tok(Piece::I,1))); s.swap(&HoldPolicy::default()).unwrap();
    assert_eq!(s.active.origin,1);
    let mut invalid = state(Slot::Occupied(tok(Piece::T,0))); assert!(invalid.swap(&HoldPolicy::default()).is_err());
}
#[test] fn configuration_single_authority() {
    let a = Environment::from_entries([("see".into(),"7".into())]).unwrap();
    let b = Environment::from_entries([("see".into(),"5".into())]).unwrap();
    assert!(Environment::resolve(Some(&a),Some(&b)).is_err());
    assert!(Environment::from_entries([("see".into(),"7".into()),("see".into(),"7".into())]).is_err());
    assert!(Environment::resolve(None,None).is_err());
    assert_eq!(Environment::resolve(None,Some(&a)).unwrap(),a);
}
