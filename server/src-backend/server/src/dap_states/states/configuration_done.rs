use crate::dap_states::dap_state::{DapState, DapStateHandler};

#[derive(Debug)]
pub struct ConfigurationDone();

impl DapStateHandler for ConfigurationDone {
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
