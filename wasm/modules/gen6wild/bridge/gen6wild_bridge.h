/*
 * PokeRNGKit Gen VI Wild WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6/Wild6.cs, Core/WildRNG.cs and RNG/MT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#pragma once

#include <cstdint>

struct Gen6WildPackedRequest
{
    std::uint32_t version;
    std::uint32_t encounterType;
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t frameCount;
    std::uint32_t delay;
    std::uint32_t considerDelay;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t shinyCharm;
    std::uint32_t syncNature;
    std::uint32_t lead;
    std::uint32_t tinySeed;
    std::uint32_t tinyFrame;
    std::uint32_t tinySynced;
    std::uint32_t encounterRate;
    std::uint32_t partyPokemon;
    std::uint32_t pidRolls;
    std::uint32_t compoundEyes;
    std::uint32_t hiddenAbility;
    std::int32_t flute;
    std::uint32_t hordeSlot;
    std::uint32_t species[13];
    std::uint32_t levels[13];
    std::uint32_t slotMetadata[13];
    std::uint32_t slotDistribution[12];
    std::uint32_t filtersDisabled;
    std::uint32_t shinyMask;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t perfectIvValue;
    std::uint32_t perfectIvCount;
    std::uint32_t slotMask;
    std::uint32_t itemFilter;
    std::uint32_t resultLimit;
};

struct Gen6WildPackedResult
{
    std::uint32_t frame;
    std::uint32_t random;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t iv0;
    std::uint32_t iv1;
    std::uint32_t metadata;
    std::uint32_t encounter;
    std::uint32_t item;
    std::uint32_t frameUsed;
    std::uint32_t psv;
    std::uint32_t prv;
    std::uint32_t reserved0;
    std::uint32_t reserved1;
    std::uint32_t reserved2;
    std::uint32_t reserved3;
};

extern "C"
{
    std::uint32_t gen6wild_api_version();
    std::uint32_t gen6wild_generate(const Gen6WildPackedRequest *request);
    std::uintptr_t gen6wild_result_ptr();
    std::uint32_t gen6wild_result_count();
    std::uint32_t gen6wild_processed_count();
    std::uint32_t gen6wild_limit_reached();
    std::uint32_t gen6wild_last_error();
}
