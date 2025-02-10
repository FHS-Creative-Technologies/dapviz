use dap_types::types::{RequestArguments, ResponseBody};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::{DapContext, VariableInfo},
};

use super::wait_for_user_input::WaitForUserInput;

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

        let next_variables_request = program_state
            .threads
            .iter()
            .filter_map(|thread| thread.stack_frames.as_ref())
            .flatten()
            .filter_map(|frame| frame.scopes.as_ref())
            .flatten()
            .find(|scope| scope.variables.is_none())
            .map(|unqueried_scope| {
                RequestArguments::variables(dap_types::types::VariablesArguments {
                    variables_reference: unqueried_scope.variables_reference,
                    count: None,
                    filter: None,
                    format: None,
                    start: None,
                })
            });

        next_variables_request.map(|request| [request].into())
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

        let scopes_count = program_state
            .threads
            .iter()
            .filter_map(|thread| thread.stack_frames.as_ref())
            .flatten()
            .filter_map(|frame| frame.scopes.as_ref())
            .flatten()
            .count();

        let current_scope = program_state
            .threads
            .iter_mut()
            .filter_map(|thread| thread.stack_frames.as_mut())
            .flatten()
            .filter_map(|frame| frame.scopes.as_mut())
            .flatten()
            .enumerate()
            .find(|(_, scope)| scope.variables.is_none());

        match response {
            ResponseBody::variables(variables) => {
                Some(current_scope.map_or(WaitForUserInput.into(), |(i, scope)| {
                    scope.variables = variables
                        .variables
                        .iter()
                        .map(VariableInfo::from)
                        .collect::<Vec<_>>()
                        .into();

                    if i == scopes_count - 1 {
                        WaitForUserInput.into()
                    } else {
                        QueryVariables.into()
                    }
                }))
            }
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
