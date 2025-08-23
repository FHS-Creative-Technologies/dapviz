use dap_types::types::{RequestArguments, ResponseBody};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::{DapContext, ProgramState, VariableResolver},
};

use super::query_stack_traces::QueryStackTraces;

#[derive(Debug)]
pub struct QueryThreads;

impl DapStateHandler for QueryThreads {
    fn next_requests(
        &self,
        _context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        Some(Box::new([RequestArguments::threads(None)]))
    }

    fn handle_response(
        &mut self,
        context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        match response {
            ResponseBody::threads(threads) => {
                context.program_state = Some(ProgramState::from_threads(&threads.threads));
                context.variable_resolver = VariableResolver::new();

                Some(QueryStackTraces.into())
            }
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
