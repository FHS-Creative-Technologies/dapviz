use dap_types::types::{NextArguments, RequestArguments};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::DapContext,
};

use super::wait_for_breakpoint_hit::WaitForBreakpointHit;

#[derive(Debug)]
pub struct Step(pub i64);

impl DapStateHandler for Step {
    fn next_requests(
        &self,
        _context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        Some(Box::new([RequestArguments::next(NextArguments {
            thread_id: self.0,
            single_thread: true.into(),
            granularity: None,
        })]))
    }

    fn handle_response(
        &mut self,
        _context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        match response {
            dap_types::types::ResponseBody::next(..) => Some(WaitForBreakpointHit.into()),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
