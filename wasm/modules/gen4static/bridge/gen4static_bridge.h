/*
 * PokeRNGKit Gen IV Static WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_STATIC4_BRIDGE_H
#define POKERNGKIT_STATIC4_BRIDGE_H

#include <cstdint>

enum Gen4StaticMethod : std::uint32_t { Gen4Method1 = 1, Gen4MethodJ = 2, Gen4MethodK = 3 };
enum Gen4StaticLead : std::uint32_t { Gen4LeadNone = 0, Gen4LeadSynchronize = 1, Gen4LeadCuteCharmF = 2, Gen4LeadCuteCharmM = 3 };
enum Gen4StaticShinyFilter : std::uint32_t { Gen4ShinyAny = 0, Gen4ShinyNot = 1, Gen4ShinyYes = 2 };
enum Gen4StaticGenderFilter : std::uint32_t { Gen4GenderAny = 0, Gen4GenderMale = 1, Gen4GenderFemale = 2, Gen4Genderless = 3 };
enum Gen4StaticAbilityFilter : std::uint32_t { Gen4AbilityAny = 0, Gen4AbilityFirst = 1, Gen4AbilitySecond = 2 };
enum Gen4StaticShinyLock : std::uint32_t { Gen4ShinyRandom = 0, Gen4ShinyNever = 1, Gen4ShinyAlways = 2 };

struct Gen4StaticPackedState {
    std::uint32_t advances, pid, hp, attack, defense, specialAttack, specialDefense, speed;
    std::uint32_t ability, gender, level, nature, shiny, hiddenPower, hiddenPowerStrength, call, chatot;
};

struct Gen4StaticPackedSearcherState {
    std::uint32_t seed, delay, hour, advances, pid, hp, attack, defense, specialAttack, specialDefense, speed;
    std::uint32_t ability, gender, level, nature, shiny, hiddenPower, hiddenPowerStrength, call, chatot;
};

extern "C" {
std::uint32_t gen4static_api_version();
std::uint32_t gen4static_generate(std::uint32_t seed, std::uint32_t initialAdvances, std::uint32_t maxAdvances,
    std::uint32_t offset, std::uint32_t method, std::uint32_t lead, std::uint32_t syncNature,
    std::uint32_t species, std::uint32_t level, std::uint32_t genderRatio, std::uint32_t shinyLock,
    std::uint32_t tid, std::uint32_t sid, std::uint32_t shinyFilter, std::uint32_t genderFilter,
    std::uint32_t abilityFilter, std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
    std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin, std::uint32_t specialAttackMin,
    std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax, std::uint32_t attackMax,
    std::uint32_t defenseMax, std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax, std::uint32_t speedMax,
    std::uint32_t perfectIvValue, std::uint32_t perfectIvCount);
std::uint32_t gen4static_search(std::uint32_t startIndex, std::uint32_t stateCount, std::uint32_t minAdvance,
    std::uint32_t maxAdvance, std::uint32_t minDelay, std::uint32_t maxDelay, std::uint32_t method,
    std::uint32_t lead, std::uint32_t syncNature, std::uint32_t species, std::uint32_t level,
    std::uint32_t genderRatio, std::uint32_t shinyLock, std::uint32_t tid, std::uint32_t sid,
    std::uint32_t shinyFilter, std::uint32_t genderFilter, std::uint32_t abilityFilter, std::uint32_t natureFilter,
    std::uint32_t hiddenPowerFilter, std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin,
    std::uint32_t specialAttackMin, std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax,
    std::uint32_t attackMax, std::uint32_t defenseMax, std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax,
    std::uint32_t speedMax, std::uint32_t perfectIvValue, std::uint32_t perfectIvCount);
std::uintptr_t gen4static_result_ptr();
std::uint32_t gen4static_result_count();
std::uint32_t gen4static_last_error();
}
#endif
