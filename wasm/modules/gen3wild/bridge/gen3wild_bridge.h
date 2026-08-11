#ifndef POKERNGKIT_WILD3_BRIDGE_H
#define POKERNGKIT_WILD3_BRIDGE_H

#include <cstdint>

struct Gen3WildPackedSlot
{
    std::uint32_t species;
    std::uint32_t form;
    std::uint32_t minLevel;
    std::uint32_t maxLevel;
    std::uint32_t genderRatio;
    std::uint32_t types;
};

struct Gen3WildPackedState
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
    std::uint32_t encounterSlot;
    std::uint32_t species;
    std::uint32_t form;
};

extern "C"
{
    std::uint32_t gen3wild_api_version();
    std::uint32_t gen3wild_generate(
        const Gen3WildPackedSlot *slots,
        std::uint32_t slotCount,
        std::uint32_t seed,
        std::uint32_t initialAdvances,
        std::uint32_t maxAdvances,
        std::uint32_t offset,
        std::uint32_t method,
        std::uint32_t lead,
        std::uint32_t encounter,
        std::uint32_t rate,
        std::uint32_t rse,
        std::uint32_t feebasTile,
        std::uint32_t feebasLocation,
        std::uint32_t safariZone,
        std::uint32_t bike,
        std::uint32_t item,
        std::uint32_t tid,
        std::uint32_t sid,
        std::uint32_t natureMask);
    std::uintptr_t gen3wild_result_ptr();
    std::uint32_t gen3wild_result_count();
    std::uint32_t gen3wild_last_error();
}

#endif
