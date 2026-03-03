use dap_types::types::{RequestArguments, StepInArguments};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::DapContext,
};

use super::wait_for_breakpoint_hit::WaitForBreakpointHit;

#[derive(Debug)]
pub struct StepIn(pub i64);

impl DapStateHandler for StepIn {
    fn next_requests(
        &self,
        _context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        Some(Box::new([RequestArguments::stepIn(StepInArguments {
            thread_id: self.0,
            target_id: None,
            single_thread: true.into(),
            granularity: None,
        })]))
    }

    fn handle_response(
        &mut self,
        context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        match response {
            dap_types::types::ResponseBody::stepIn(..) => {
                context.active_thread = Some(self.0);
                Some(WaitForBreakpointHit.into())
            }
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
