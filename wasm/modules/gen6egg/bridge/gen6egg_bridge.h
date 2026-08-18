/* PokeRNGKit Gen VI Egg WebAssembly bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct Gen6EggResult
{
    std::uint32_t words[20];
};

extern "C"
{
    std::uint32_t gen6egg_api_version();
    std::uint32_t gen6egg_begin(const std::uint32_t *request);
    std::uint32_t gen6egg_step(std::uint32_t maximumStates);
    std::uintptr_t gen6egg_result_ptr();
    std::uint32_t gen6egg_result_count();
    std::uint32_t gen6egg_step_processed();
    std::uint32_t gen6egg_total_processed();
    std::uint32_t gen6egg_done();
    std::uint32_t gen6egg_last_error();
}
