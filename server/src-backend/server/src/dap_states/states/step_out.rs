use dap_types::types::{RequestArguments, StepOutArguments};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::DapContext,
};

use super::wait_for_user_input::WaitForUserInput;

#[derive(Debug)]
pub struct StepOut(pub i64);

impl DapStateHandler for StepOut {
    fn next_requests(
        &self,
        _context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        Some(Box::new([RequestArguments::stepOut(StepOutArguments {
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
            dap_types::types::ResponseBody::stepOut(..) => Some(WaitForUserInput.into()),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
