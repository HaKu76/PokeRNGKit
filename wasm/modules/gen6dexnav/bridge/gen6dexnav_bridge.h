/*
 * PokeRNGKit Gen VI DexNav WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6/DexNav.cs and RNG/TinyMT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#pragma once

#include <cstdint>

struct Gen6DexNavPackedRequest
{
    std::uint32_t tinySeed;
    std::uint32_t minFrame;
    std::uint32_t frameCount;
    std::uint32_t tinyFrame;
    std::uint32_t encounterType;
    std::uint32_t activeSearch;
    std::uint32_t hasDexNav;
    std::uint32_t searchLevel;
    std::uint32_t chainLength;
    std::uint32_t shinyCharm;
    std::uint32_t compoundEyes;
    std::uint32_t forcedShiny;
    std::uint32_t navHa;
    std::uint32_t navUnown;
    std::uint32_t potential;
    std::int32_t flute;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t species[13];
    std::uint32_t levels[13];
    std::uint32_t resultLimit;
};

struct Gen6DexNavPackedResult
{
    std::uint32_t frame;
    std::uint32_t random;
    std::uint32_t coordinates;
    std::uint32_t slot;
    std::uint32_t details;
    std::uint32_t flags;
    std::uint32_t species;
    std::uint32_t level;
    std::uint32_t grade;
    std::uint32_t searchLevel;
    std::uint32_t psv;
    std::uint32_t prv;
    std::uint32_t reserved0;
    std::uint32_t reserved1;
    std::uint32_t reserved2;
    std::uint32_t reserved3;
};

extern "C"
{
    std::uint32_t gen6dexnav_api_version();
    std::uint32_t gen6dexnav_generate(const Gen6DexNavPackedRequest *request);
    std::uintptr_t gen6dexnav_result_ptr();
    std::uint32_t gen6dexnav_result_count();
    std::uint32_t gen6dexnav_processed_count();
    std::uint32_t gen6dexnav_limit_reached();
    std::uint32_t gen6dexnav_last_error();
}
