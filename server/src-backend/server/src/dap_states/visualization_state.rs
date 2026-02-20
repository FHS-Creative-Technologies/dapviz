use std::collections::HashSet;

use itertools::Itertools;
use serde::Serialize;

use crate::dap_states::dap_state_machine::{ProgramState, ThreadInfo, VariableInfoData};

#[derive(Debug, Clone, Serialize)]
pub struct HeapVariableInfo {
    pub reference: i64,
    pub name: String,
    pub value: String,
    pub address: String,

    #[serde(rename = "type")]
    pub type_: String,

    pub fields: Vec<VariableInfoData>,
}

#[derive(Default, Debug, Clone, Serialize)]
pub struct VisualizationState {
    threads: Vec<ThreadInfo>,
    heap_variables: Vec<HeapVariableInfo>,
}

impl From<&ProgramState> for VisualizationState {
    fn from(value: &ProgramState) -> Self {
        let mut threads = value.threads.clone();
        threads.reverse();

        let mut visualization_state = VisualizationState {
            threads,
            heap_variables: Vec::new(),
        };

        let mut complete_heap_variables = HashSet::<i64>::new();

        for thread in visualization_state.threads.iter_mut() {
            let Some(stack_frames) = thread.stack_frames.as_mut() else {
                continue;
            };

            for stack_frame in stack_frames.iter_mut() {
                let Some(scopes) = stack_frame.scopes.as_mut() else {
                    continue;
                };

                for scope in scopes {
                    let Some(variables) = scope.variables.as_mut() else {
                        continue;
                    };

                    let heap_variable_members = variables
                        .extract_if(.., |variable| variable.inner().parent.is_some())
                        .map(|variable| variable.into_inner())
                        .into_group_map_by(|variable| {
                            variable
                                .parent
                                .expect("heap variable members must have parent set")
                        });

                    let mut heap_variables = variables
                        .iter()
                        .filter(|variable| {
                            variable.inner().reference != 0
                                && complete_heap_variables.insert(variable.inner().reference)
                        })
                        .cloned()
                        .map(|variable| {
                            let var = variable.into_inner();
                            HeapVariableInfo {
                                reference: var.reference,
                                name: var.name,
                                value: var.value,
                                address: var.address,
                                type_: var.type_,
                                fields: heap_variable_members
                                    .get(&var.reference)
                                    .unwrap_or(&Vec::new())
                                    .clone(),
                            }
                        })
                        .collect::<Vec<_>>();

                    // FIXME: for some reason this misses halver.vec. why?
                    visualization_state
                        .heap_variables
                        .append(&mut heap_variables);
                }
            }
        }

        visualization_state
    }
}
