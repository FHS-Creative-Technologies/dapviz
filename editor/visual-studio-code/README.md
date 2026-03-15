# dapviz

![Screenshot of dapviz debugging a program, visualizing a graph of objects in memory](https://raw.githubusercontent.com/FHS-Creative-Technologies/dapviz/refs/heads/main/editor/visual-studio-code/docs/title.png)

dapviz is a debugger that visualizes a running program’s memory as a graph,
showing how stack variables and heap objects are laid out and connected.

It is designed as a learning tool to help beginner programmers understand
the concepts of reference and value types.

## Usage

### Install Debug Adapter

Run command `dapviz: Install a debug adapter`.

Select the adapter for the language you want to debug:
Currently supported languages:

- C# -> netcoredbg

### Run a Program

1. Run command `dapviz: Start session`.
1. Select the debug adapter backend.
1. Choose the program to debug.

> [!IMPORTANT]  
> For C# programs, choose the `*.dll` file, not the `*.exe` file.

### Update dapviz

Run command `dapviz: Install/Update dapviz backend`.

## Requirements

- Windows 10 or newer
- Apple Silicon Macs (M1 or newer)

Currently Linux is not supported.

