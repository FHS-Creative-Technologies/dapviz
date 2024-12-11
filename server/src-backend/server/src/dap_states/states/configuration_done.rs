use dap_types::types::{RequestArguments, ResponseBody};

use crate::dap_states::{dap_state::{DapState, DapStateHandler}, dap_state_machine::DapContext};

use super::query_threads::QueryThreads;

#[derive(Debug)]
pub struct ConfigurationDone;

impl DapStateHandler for ConfigurationDone {
    fn next_requests(&self, _context: &DapContext) -> Option<Box<[dap_types::types::RequestArguments]>> {
        Some(Box::new([RequestArguments::configurationDone(None)]))
    }

    fn handle_response(&mut self, _context: &DapContext, response: &dap_types::types::ResponseBody) -> Option<DapState> {
        match response {
            ResponseBody::configurationDone(..) => Some(QueryThreads.into()),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
