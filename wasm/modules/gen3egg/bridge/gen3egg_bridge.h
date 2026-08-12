#ifndef POKERNGKIT_GEN3EGG_BRIDGE_H
#define POKERNGKIT_GEN3EGG_BRIDGE_H

#include <cstdint>

struct Gen3EggPackedState
{
    std::uint32_t advances;
    std::uint32_t pickupAdvances;
    std::uint32_t redraws;
    std::uint32_t pid;
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t nature;
    std::uint32_t shiny;
    std::uint32_t hp;
    std::uint32_t attack;
    std::uint32_t defense;
    std::uint32_t specialAttack;
    std::uint32_t specialDefense;
    std::uint32_t speed;
    std::uint32_t inheritanceHp;
    std::uint32_t inheritanceAttack;
    std::uint32_t inheritanceDefense;
    std::uint32_t inheritanceSpecialAttack;
    std::uint32_t inheritanceSpecialDefense;
    std::uint32_t inheritanceSpeed;
    std::uint32_t hiddenPower;
    std::uint32_t hiddenPowerStrength;
};

extern "C"
{
    std::uint32_t gen3egg_api_version();
    std::uint32_t gen3egg_generate(const std::uint32_t *request, std::uint32_t requestWords,
                                   std::uint32_t initialAdvancesHeld, std::uint32_t maxAdvancesHeld,
                                   std::uint32_t maxResults);
    std::uintptr_t gen3egg_result_ptr();
    std::uint32_t gen3egg_result_count();
    std::uint32_t gen3egg_result_truncated();
    std::uint32_t gen3egg_last_error();
}

#endif
