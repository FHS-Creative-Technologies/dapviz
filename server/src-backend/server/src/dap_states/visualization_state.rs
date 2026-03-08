use std::collections::BTreeMap;

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

        let mut heap_variables = BTreeMap::<i64, (VariableInfoData, Vec<VariableInfoData>)>::new();

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
                        scope.variables = Some(Vec::new());
                        continue;
                    };

                    // get all reference variables
                    for local_heap_variable in variables
                        .iter()
                        .filter(|variable| variable.inner().reference != 0)
                    {
                        heap_variables
                            .entry(local_heap_variable.inner().reference)
                            .or_insert_with(|| {
                                (local_heap_variable.clone().into_inner(), Vec::new())
                            });
                    }

                    // remove all reference variable members from stack and add to heap variable
                    // member lookup
                    for local_heap_variable_member in variables
                        .extract_if(.., |variable| variable.inner().parent.is_some())
                        .map(|variable| variable.into_inner())
                    {
                        let (_, members) = heap_variables
                            .get_mut(
                                &local_heap_variable_member
                                    .parent
                                    .expect("heap variable members must have parent set"),
                            )
                            .expect("should not encounter parent that hasn't been discovered yet");

                        members.push(local_heap_variable_member);
                    }
                }
            }

            // reverse stack frames so visualization has an easier time
            stack_frames.reverse();
        }

        visualization_state.heap_variables = heap_variables
            .into_iter()
            .map(|(reference, (variable, members))| HeapVariableInfo {
                reference,
                name: variable.name,
                value: variable.value,
                address: variable.address,
                type_: variable.type_,
                fields: members,
            })
            .collect();

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

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use crate::{
        dap_states::{
            dap_state_machine::{
                DapContext, ProgramState, ScopeInfo, StackFrameInfo, ThreadInfo, VariableInfo,
                VariableInfoData, VariableResolver,
            },
            visualization_state::VisualizationState,
        },
        debug_adapters::DebugAdapter,
    };

    #[test]
    fn playground_heap_is_visualized_correctly() {
        let context = build_test_context();

        let visualization_state = VisualizationState::from(&context);

        for heap_variable in &visualization_state.heap_variables {
            if heap_variable.name == "vector" {
                assert_eq!(heap_variable.fields.len(), 3);
            }
        }
    }

    fn build_test_context() -> DapContext {
        DapContext {
            debug_adapter: DebugAdapter::NetCoreDbg,
            source_files: HashMap::from_iter([(
                "/Users/thekatze/Development/dapviz/playground/csharp/Program.cs".to_string(),
                "".to_string(),
            )]),
            executable_path:
                "/Users/thekatze/Development/dapviz/playground/csharp/bin/Debug/net10.0/csharp.dll"
                    .into(),
            active_thread: Some(12655656),
            program_state: Some(ProgramState {
                threads: vec![ThreadInfo {
                    id: 12655656,
                    name: "Main Thread".into(),
                    stack_frames: Some(vec![
                        StackFrameInfo {
                            id: 31,
                            file: "/Users/thekatze/Development/dapviz/playground/csharp/Program.cs"
                                .into(),
                            line: 45,
                            function: "HeapObjectsTest.VectorScaler..ctor()".into(),
                            scopes: Some(vec![ScopeInfo {
                                variables_reference: 1,
                                variables: Some(vec![
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 4,
                                        name: "this".into(),
                                        value: "{HeapObjectsTest.VectorScaler}".into(),
                                        address: "0x000000030000feb8".into(),
                                        type_: "HeapObjectsTest.VectorScaler".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 5,
                                        name: "vec".into(),
                                        value: "{HeapObjectsTest.Vector3}".into(),
                                        address: "0x000000030000fe98".into(),
                                        type_: "HeapObjectsTest.Vector3".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 0,
                                        name: "multiplier".into(),
                                        value: "2".into(),
                                        address: "0x000000016dac9c6c".into(),
                                        type_: "float".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: Some(4),
                                        reference: 0,
                                        name: "vec".into(),
                                        value: "null".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "HeapObjectsTest.Vector3".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: Some(4),
                                        reference: 0,
                                        name: "multiplier".into(),
                                        value: "0".into(),
                                        address: "0x000000030000fec8".into(),
                                        type_: "float".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: Some(5),
                                        reference: 0,
                                        name: "X".into(),
                                        value: "5".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "float".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: Some(5),
                                        reference: 0,
                                        name: "Y".into(),
                                        value: "10".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "float".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: Some(5),
                                        reference: 0,
                                        name: "Z".into(),
                                        value: "50".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "float".into(),
                                    }),
                                ]),
                            }]),
                        },
                        StackFrameInfo {
                            id: 32,
                            file: "/Users/thekatze/Development/dapviz/playground/csharp/Program.cs"
                                .into(),
                            line: 71,
                            function: "HeapObjectsTest.Run()".into(),
                            scopes: Some(vec![ScopeInfo {
                                variables_reference: 2,
                                variables: Some(vec![
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 0,
                                        name: "this".into(),
                                        value: "{HeapObjectsTest}".into(),
                                        address: "0x000000030000fe80".into(),
                                        type_: "HeapObjectsTest".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 5,
                                        name: "vector".into(),
                                        value: "{HeapObjectsTest.Vector3}".into(),
                                        address: "0x000000030000fe98".into(),
                                        type_: "HeapObjectsTest.Vector3".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 0,
                                        name: "doubler".into(),
                                        value: "null".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "HeapObjectsTest.VectorScaler".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 0,
                                        name: "halver".into(),
                                        value: "null".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "HeapObjectsTest.VectorScaler".into(),
                                    }),
                                    VariableInfo::Queried(VariableInfoData {
                                        parent: None,
                                        reference: 0,
                                        name: "undoer".into(),
                                        value: "null".into(),
                                        address: "0x0000000000000000".into(),
                                        type_: "HeapObjectsTest.VectorScaler".into(),
                                    }),
                                ]),
                            }]),
                        },
                        StackFrameInfo {
                            id: 33,
                            file: "/Users/thekatze/Development/dapviz/playground/csharp/Program.cs"
                                .into(),
                            line: 6,
                            function: "Program.Main()".into(),
                            scopes: Some(vec![ScopeInfo {
                                variables_reference: 3,
                                variables: Some(vec![VariableInfo::Queried(VariableInfoData {
                                    parent: None,
                                    reference: 0,
                                    name: "args".into(),
                                    value: "{string[0]}".into(),
                                    address: "0x000000030000dbb8".into(),
                                    type_: "string[]".into(),
                                })]),
                            }]),
                        },
                    ]),
                }],
            }),
            variable_resolver: VariableResolver::default(),
        }
    }
}
