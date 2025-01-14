use crate::{
    dap_states::{
        dap_state::{DapState, DapStateHandler},
        dap_state_machine::DapContext,
    },
    user_request::UserRequest,
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

    fn handle_user_request(&mut self, request: &UserRequest) -> Option<DapState> {
        Some(request.into())
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
