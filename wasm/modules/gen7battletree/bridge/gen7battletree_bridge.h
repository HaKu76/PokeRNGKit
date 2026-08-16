/*
 * PokeRNGKit Gen VII Battle Tree WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Battle Tree behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7BATTLETREE_BRIDGE_H
#define POKERNGKIT_GEN7BATTLETREE_BRIDGE_H

#include <cstdint>

struct Gen7BattleTreePackedRequest
{
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t version;
    std::uint32_t npc;
    std::uint32_t delay;
    std::uint32_t streak;
    std::uint32_t trainerFilter;
    std::uint32_t resultLimit;
};

struct Gen7BattleTreePackedResult
{
    std::uint32_t frame;
    std::uint32_t actualFrame;
    std::uint32_t realTimeFrames;
    std::uint32_t randomLow;
    std::uint32_t randomHigh;
    std::uint32_t trainerId;
    std::uint32_t blink;
};

extern "C"
{
    std::uint32_t gen7battletree_api_version();
    std::uint32_t gen7battletree_begin(const Gen7BattleTreePackedRequest *request);
    std::uint32_t gen7battletree_step(std::uint32_t maximumStates);
    std::uintptr_t gen7battletree_result_ptr();
    std::uint32_t gen7battletree_result_count();
    std::uint32_t gen7battletree_step_processed();
    std::uint32_t gen7battletree_total_processed();
    std::uint32_t gen7battletree_total_results();
    std::uint32_t gen7battletree_done();
    std::uint32_t gen7battletree_limit_reached();
    std::uint32_t gen7battletree_last_error();
}

#endif
