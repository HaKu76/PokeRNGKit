/* PokeRNGKit Gen VI TinyFinder Ambush bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct gen6tinyambushResult
{
    std::uint32_t words[16];
};

extern "C"
{
    std::uint32_t gen6tinyambush_api_version();
    std::uint32_t gen6tinyambush_begin(const std::uint32_t *request);
    std::uint32_t gen6tinyambush_step(std::uint32_t maximumStates);
    std::uintptr_t gen6tinyambush_result_ptr();
    std::uint32_t gen6tinyambush_result_count();
    std::uint32_t gen6tinyambush_step_processed();
    std::uint32_t gen6tinyambush_total_processed();
    std::uint32_t gen6tinyambush_done();
    std::uint32_t gen6tinyambush_limit_reached();
    std::uint32_t gen6tinyambush_last_error();
}
