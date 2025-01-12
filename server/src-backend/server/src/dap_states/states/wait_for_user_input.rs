use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::DapContext,
};

#[derive(Debug)]
pub struct WaitForUserInput;

impl DapStateHandler for WaitForUserInput {
    fn next_requests(
        &self,
        _context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        None
    }

    fn handle_user_request(
        &mut self,
        request: &crate::dap_client::UserRequest,
    ) -> Option<DapState> {
        match request {
            crate::dap_client::UserRequest::Step => todo!("handle step request"),
            crate::dap_client::UserRequest::StepIn => todo!(),
            crate::dap_client::UserRequest::StepOut => todo!(),
        }
    }

    fn handle_response(
        &mut self,
        _context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        tracing::error!("Unexpected DAP Response: {}", response);

        None
    }
}
