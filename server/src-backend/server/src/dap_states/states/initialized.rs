use crate::{
    dap_client::Language,
    dap_states::dap_state::{DapState, DapStateHandler},
};

#[derive(Debug)]
pub struct InitializedState(pub Language);

impl DapStateHandler for InitializedState {
    fn next_requests(&self) -> Option<Box<[dap_types::types::RequestArguments]>> {
        None
    }

    fn handle_response(&mut self, response: &dap_types::types::ResponseBody) -> Option<DapState> {
        match response {
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
