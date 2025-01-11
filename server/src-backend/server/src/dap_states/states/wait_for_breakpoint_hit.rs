use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::DapContext,
};

use super::query_threads::QueryThreads;

#[derive(Debug)]
pub struct WaitForBreakpointHit;

impl DapStateHandler for WaitForBreakpointHit {
    fn next_requests(
        &self,
        _context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        None
    }

    fn handle_event(
        &mut self,
        _context: &DapContext,
        event: &dap_types::types::EventBody,
    ) -> Option<DapState> {
        match event {
            dap_types::types::EventBody::stopped(..) => Some(QueryThreads.into()),
            _ => None,
        }
    }

    fn handle_response(
        &mut self,
        _context: &DapContext,
        _response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        None
    }
}
