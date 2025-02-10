use dap_types::types::ResponseBody;

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::DapContext,
};

#[derive(Debug)]
pub struct QueryVariables;

impl DapStateHandler for QueryVariables {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let program_state = context
            .program_state
            .as_ref()
            .expect("current state expects initialized program state");

        // TODO:
        // 1) variables request for scope -> we get variables yay

        None
    }

    fn handle_response(
        &mut self,
        context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        let program_state = context
            .program_state
            .as_ref()
            .expect("current state expects initialized program state");

        match response {
            ResponseBody::threads(threads) => None,
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
