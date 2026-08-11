#ifndef POKERNGKIT_STATIC3_BRIDGE_H
#define POKERNGKIT_STATIC3_BRIDGE_H

#include <cstdint>

enum class Gen3StaticMethod : std::uint32_t
{
    Method1 = 1,
    Method4 = 4,
};

enum Gen3StaticShinyFilter : std::uint32_t
{
    ShinyAny = 0,
    ShinyNone = 1,
    ShinyAnyShiny = 2,
    ShinyStar = 3,
    ShinySquare = 4,
};

enum Gen3StaticGenderFilter : std::uint32_t
{
    GenderAny = 0,
    GenderMale = 1,
    GenderFemale = 2,
    Genderless = 3,
};

enum Gen3StaticAbilityFilter : std::uint32_t
{
    AbilityAny = 0,
    AbilityFirst = 1,
    AbilitySecond = 2,
};

struct Gen3StaticPackedState
{
    std::uint32_t advances;
    std::uint32_t pid;
    std::uint32_t hp;
    std::uint32_t attack;
    std::uint32_t defense;
    std::uint32_t specialAttack;
    std::uint32_t specialDefense;
    std::uint32_t speed;
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t level;
    std::uint32_t natureShiny;
};

extern "C"
{
    std::uint32_t gen3static_api_version();
    std::uint32_t gen3static_generate(
        std::uint32_t seed,
        std::uint32_t initialAdvances,
        std::uint32_t maxAdvances,
        std::uint32_t offset,
        std::uint32_t method,
        std::uint32_t species,
        std::uint32_t level,
        std::uint32_t genderRatio,
        std::uint32_t buggedRoamer,
        std::uint32_t tid,
        std::uint32_t sid,
        std::uint32_t shinyFilter,
        std::uint32_t genderFilter,
        std::uint32_t abilityFilter,
        std::uint32_t natureFilter,
        std::uint32_t hpMin,
        std::uint32_t attackMin,
        std::uint32_t defenseMin,
        std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin,
        std::uint32_t speedMin,
        std::uint32_t hpMax,
        std::uint32_t attackMax,
        std::uint32_t defenseMax,
        std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax,
        std::uint32_t speedMax);
    std::uint32_t gen3static_search(
        std::uint32_t startIndex,
        std::uint32_t stateCount,
        std::uint32_t method,
        std::uint32_t species,
        std::uint32_t level,
        std::uint32_t genderRatio,
        std::uint32_t buggedRoamer,
        std::uint32_t tid,
        std::uint32_t sid,
        std::uint32_t shinyFilter,
        std::uint32_t genderFilter,
        std::uint32_t abilityFilter,
        std::uint32_t natureFilter,
        std::uint32_t hpMin,
        std::uint32_t attackMin,
        std::uint32_t defenseMin,
        std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin,
        std::uint32_t speedMin,
        std::uint32_t hpMax,
        std::uint32_t attackMax,
        std::uint32_t defenseMax,
        std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax,
        std::uint32_t speedMax);
    std::uintptr_t gen3static_result_ptr();
    std::uint32_t gen3static_result_count();
    std::uint32_t gen3static_last_error();
}

#endif
