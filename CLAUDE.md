# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Budget-FE is a frontend application built with Gleam and Lustre targeting JavaScript. It's a budgeting application that allows users to:
- Track transactions
- Create and manage categories for expenses
- Allocate budget to different categories
- View and manage budget cycles

The project follows an Elm-like architecture with a Model-View-Update pattern through Lustre.

## Commands

### Development

```sh
# Run the project
gleam run

# Run tests
gleam test

# Build the project for JavaScript
gleam build
```

## Project Structure

- **src/budget_fe.gleam**: Main entry point for the application
- **src/budget_fe/internals/**: Core modules for the application
  - **app.ffi.mjs**: JavaScript FFI functions
  - **effects.gleam**: Effects for interacting with the backend API and local storage
  - **msg.gleam**: Message and Model type definitions
  - **view.gleam**: UI rendering logic

## Architecture

The application follows the TEA (The Elm Architecture) pattern:

1. **Model**: Defined in `msg.gleam`, holds the entire application state
2. **Update**: Implemented in `budget_fe.gleam`, handles messages and updates the model
3. **View**: Implemented in `view.gleam`, renders UI based on the model
4. **Effects**: Defined in `effects.gleam`, handles side effects like API calls

The application interacts with a backend API (configurable between local development and production endpoints) for data storage and retrieval.

## Current Development Focus

According to the todo.txt file, the current development focus is on:
1. Major redesign
2. Implementing transaction import functionality

Recent git commits show work on an import form feature.