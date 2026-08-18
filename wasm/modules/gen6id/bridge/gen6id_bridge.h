/* PokeRNGKit Gen VI ID WebAssembly bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct Gen6IdResult
{
    std::uint32_t words[8];
};

extern "C"
{
    std::uint32_t gen6id_api_version();
    std::uint32_t gen6id_begin(const std::uint32_t *request);
    std::uint32_t gen6id_step(std::uint32_t maximumStates);
    std::uintptr_t gen6id_result_ptr();
    std::uint32_t gen6id_result_count();
    std::uint32_t gen6id_step_processed();
    std::uint32_t gen6id_total_processed();
    std::uint32_t gen6id_done();
    std::uint32_t gen6id_last_error();
}
