# Tests — Phase 2

This directory will contain tests for the Insight Copilot backend.

## Planned test coverage

- **Profiler tests**: Verify dtype detection across edge cases (mixed types, currency strings, ambiguous dates)
- **Analysis template tests**: Each template tested against the sample dataset with expected output shapes
- **Prompt validation tests**: Ensure LLM responses conform to Pydantic schemas
- **API integration tests**: End-to-end upload → profile → analyze flow

## Why tests are deferred

This is a portfolio MVP with a 7-day timeline. The codebase is structured for testability (thin routers, pure service functions, typed schemas), and tests will be added in the next iteration.
