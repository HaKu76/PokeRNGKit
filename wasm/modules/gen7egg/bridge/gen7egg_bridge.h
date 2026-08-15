/*
 * PokeRNGKit Gen VII Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Egg behavior is adapted from 3DSRNGTool by wwwwwzx (MIT).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7EGG_BRIDGE_H
#define POKERNGKIT_GEN7EGG_BRIDGE_H

#include <cstdint>

struct Gen7EggPackedRequest
{
    std::uint32_t mode;
    std::uint32_t status[4];
    std::uint32_t rangeStart;
    std::uint32_t rangeEnd;
    std::uint32_t targetFrame;
    std::uint32_t resultLimit;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t maleIvs[6];
    std::uint32_t femaleIvs[6];
    std::uint32_t maleItem;
    std::uint32_t femaleItem;
    std::uint32_t maleAbility;
    std::uint32_t femaleAbility;
    std::uint32_t genderRatio;
    std::uint32_t shinyCharm;
    std::uint32_t masudaMethod;
    std::uint32_t nidoType;
    std::uint32_t homogeneous;
    std::uint32_t maleIsDitto;
    std::uint32_t femaleIsDitto;
    std::uint32_t considerOtherTsv;
    std::uint32_t shinyReminder;
    std::uint32_t otherTsvMask[128];
    std::uint32_t filtersDisabled;
    std::uint32_t shinyOnly;
    std::uint32_t squareShinyOnly;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t perfectIvValue;
    std::uint32_t perfectIvCount;
    std::uint32_t ballFilter;
    std::uint32_t natureInheritanceFilter;
};

struct Gen7EggPackedResult
{
    std::uint32_t frame;
    std::uint32_t eggNumber;
    std::uint32_t state[4];
    std::uint32_t afterState[4];
    std::uint32_t random;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t ivs;
    std::uint32_t metadata;
    std::uint32_t framesUsed;
    std::uint32_t inheritedMaleMask;
    std::uint32_t inheritedFemaleMask;
    std::uint32_t psv;
    std::uint32_t prv;
};

extern "C"
{
    std::uint32_t gen7egg_api_version();
    std::uint32_t gen7egg_begin(const Gen7EggPackedRequest *request);
    std::uint32_t gen7egg_step(std::uint32_t maximumStates);
    std::uintptr_t gen7egg_result_ptr();
    std::uint32_t gen7egg_result_count();
    std::uint32_t gen7egg_step_processed();
    std::uint32_t gen7egg_total_processed();
    std::uint32_t gen7egg_total_results();
    std::uint32_t gen7egg_done();
    std::uint32_t gen7egg_limit_reached();
    std::uint32_t gen7egg_target_found();
    std::uint32_t gen7egg_summary_accepts();
    std::uint32_t gen7egg_summary_rejects();
    std::uint32_t gen7egg_last_error();
}

#endif
