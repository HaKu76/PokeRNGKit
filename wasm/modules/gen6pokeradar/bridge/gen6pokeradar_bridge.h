/* PokeRNGKit Gen VI Poke Radar WebAssembly bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct Gen6PokeRadarRequest
{
    std::uint32_t tinySeed;
    std::uint32_t minFrame;
    std::uint32_t frameCount;
    std::uint32_t tinyFrame;
    std::uint32_t partySize;
    std::uint32_t chainLength;
    std::uint32_t boost;
    std::uint32_t resultLimit;
};

struct Gen6PokeRadarResult
{
    std::uint32_t frame;
    std::uint32_t music;
    std::uint32_t patches[5];
    std::uint32_t reserved[9];
};

extern "C"
{
    std::uint32_t gen6pokeradar_api_version();
    std::uint32_t gen6pokeradar_generate(const Gen6PokeRadarRequest *request);
    std::uintptr_t gen6pokeradar_result_ptr();
    std::uint32_t gen6pokeradar_result_count();
    std::uint32_t gen6pokeradar_processed_count();
    std::uint32_t gen6pokeradar_limit_reached();
    std::uint32_t gen6pokeradar_last_error();
}
