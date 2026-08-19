/* PokeRNGKit Gen VI TinyMT Index WebAssembly bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct Gen6TinyIndexResult
{
    std::uint32_t words[8];
};

extern "C"
{
    std::uint32_t gen6tinyindex_api_version();
    std::uint32_t gen6tinyindex_begin(const std::uint32_t *request);
    std::uint32_t gen6tinyindex_step(std::uint32_t maximumStates);
    std::uintptr_t gen6tinyindex_result_ptr();
    std::uint32_t gen6tinyindex_result_count();
    std::uint32_t gen6tinyindex_step_processed();
    std::uint32_t gen6tinyindex_total_processed();
    std::uint32_t gen6tinyindex_done();
    std::uint32_t gen6tinyindex_last_error();
}
