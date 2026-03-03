use std::collections::HashSet;

use itertools::Itertools;
use serde::Serialize;

use crate::dap_states::dap_state_machine::{DapContext, ThreadInfo, VariableInfoData};

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
    current_source_file: Option<(String, String, i64)>,
}

impl From<&DapContext> for VisualizationState {
    fn from(context: &DapContext) -> Self {
        let mut visualization_state = VisualizationState {
            threads: context
                .program_state
                .as_ref()
                .map(|state| state.threads.clone())
                .unwrap_or_else(|| Vec::new()),
            heap_variables: Vec::new(),
            current_source_file: None,
        };

        let mut complete_heap_variables = HashSet::<i64>::new();

        for thread in visualization_state.threads.iter_mut() {
            let Some(stack_frames) = thread.stack_frames.as_mut() else {
                continue;
            };

            // reverse stack frames so visualization has an easier time
            stack_frames.reverse();

            for stack_frame in stack_frames.iter_mut() {
                let Some(scopes) = stack_frame.scopes.as_mut() else {
                    continue;
                };

                for scope in scopes {
                    let Some(variables) = scope.variables.as_mut() else {
                        continue;
                    };

                    // get all reference variables
                    let heap_variables = variables
                        .iter()
                        .filter(|variable| {
                            variable.inner().reference != 0
                                && complete_heap_variables.insert(variable.inner().reference)
                        })
                        .cloned()
                        .collect::<Vec<_>>();

                    // remove all reference variable members from stack
                    let heap_variable_members = variables
                        .extract_if(.., |variable| variable.inner().parent.is_some())
                        .map(|variable| variable.into_inner())
                        .into_group_map_by(|variable| {
                            variable
                                .parent
                                .expect("heap variable members must have parent set")
                        });

                    // write all heap variable members into their according heap variable
                    let mut heap_variables = heap_variables
                        .into_iter()
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

                    visualization_state
                        .heap_variables
                        .append(&mut heap_variables);
                }
            }
        }

        if let Some(active_thread_id) = context.active_thread {
            let current_stack_frames = visualization_state
                .threads
                .iter()
                .find_map(|thread| {
                    (thread.id == active_thread_id).then(|| thread.stack_frames.as_ref())
                })
                .flatten();

            if let Some(stack_frames) = current_stack_frames {
                let stack_frame = stack_frames
                    .last()
                    .expect("thread must have one stack frame");

                let file_name = stack_frame.file.clone();
                let file_contents = context
                    .source_files
                    .get(&file_name)
                    .expect("file should have been loaded to context");
                let line = stack_frame.line;

                visualization_state.current_source_file =
                    Some((file_name, file_contents.clone(), line))
            }
        }

        visualization_state
    }
}
