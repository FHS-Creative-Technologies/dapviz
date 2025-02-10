use dap_types::types::{RequestArguments, ResponseBody};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::{DapContext, ScopeInfo},
};

use super::query_variables::QueryVariables;

#[derive(Debug)]
pub struct QueryScopes;

impl DapStateHandler for QueryScopes {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let program_state = context
            .program_state
            .as_ref()
            .expect("current state expects initialized program state");

        if program_state.threads.is_empty() {
            tracing::warn!("QueryScopes state entered without threads in ProgramState")
        }

        let next_scope_request = program_state
            .threads
            .iter()
            .filter_map(|thread| thread.stack_frames.as_ref())
            .flatten()
            .filter_map(|frame| {
                frame.scopes.is_none().then_some(RequestArguments::scopes(
                    dap_types::types::ScopesArguments { frame_id: frame.id },
                ))
            })
            .next();

        next_scope_request.map(|request| [request].into())
    }

    fn handle_response(
        &mut self,
        context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        let program_state = context
            .program_state
            .as_mut()
            .expect("current state expects initialized program state");

        let stack_frame_count = program_state
            .threads
            .iter_mut()
            .filter_map(|thread| thread.stack_frames.as_mut())
            .flatten()
            .count();

        let next_empty_stack_frame = program_state
            .threads
            .iter_mut()
            .filter_map(|thread| thread.stack_frames.as_mut())
            .flatten()
            .enumerate()
            .find(|(_, frame)| frame.scopes.is_none());

        match response {
            ResponseBody::scopes(scopes) => Some(next_empty_stack_frame.map_or(
                QueryVariables.into(),
                |(index, stack_frame)| {
                    stack_frame.scopes = scopes
                        .scopes
                        .iter()
                        .map(ScopeInfo::from)
                        .collect::<Vec<_>>()
                        .into();

                    if index == stack_frame_count - 1 {
                        QueryVariables.into()
                    } else {
                        QueryScopes.into()
                    }
                },
            )),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
