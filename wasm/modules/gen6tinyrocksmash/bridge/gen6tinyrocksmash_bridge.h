/* PokeRNGKit Gen VI TinyFinder Rock Smash bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct Gen6TinyRockSmashResult
{
    std::uint32_t words[24];
};

extern "C"
{
    std::uint32_t gen6tinyrocksmash_api_version();
    std::uint32_t gen6tinyrocksmash_begin(const std::uint32_t *request);
    std::uint32_t gen6tinyrocksmash_step(std::uint32_t maximumStates);
    std::uintptr_t gen6tinyrocksmash_result_ptr();
    std::uint32_t gen6tinyrocksmash_result_count();
    std::uint32_t gen6tinyrocksmash_step_processed();
    std::uint32_t gen6tinyrocksmash_total_processed();
    std::uint32_t gen6tinyrocksmash_done();
    std::uint32_t gen6tinyrocksmash_limit_reached();
    std::uint32_t gen6tinyrocksmash_last_error();
}
