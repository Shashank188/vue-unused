# vue-unused

A CLI tool for detecting dead code and dead exports in Vue3 projects. It analyzes staged git changes and reports unused files, exports, and configs with confidence scores.

## Installation

npm install -g vue-unused

## Usage

In your Vue3 project root:

vue-unused

It will output JSON with segregated results: files, exports, configs.

Each item has confidence percentage and reason.

## Demo

See demo/ for a sample Vue3 project with used and unused code.