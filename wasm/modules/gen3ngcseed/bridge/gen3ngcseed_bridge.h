#ifndef POKERNGKIT_GEN3_NGC_SEED_BRIDGE_H
#define POKERNGKIT_GEN3_NGC_SEED_BRIDGE_H

#include <cstdint>

enum class Gen3NgcSeedMode : std::uint32_t
{
    Gales = 0,
    Colo = 1,
    Channel = 2,
};

struct Gen3NgcSeedPackedState
{
    std::uint32_t seed;
};

extern "C"
{
    std::uint32_t gen3ngcseed_api_version();
    std::uint32_t gen3ngcseed_search_gales(
        std::uint32_t playerIndex,
        std::uint32_t enemyIndex,
        std::uint32_t enemyHpLeft,
        std::uint32_t enemyHpRight,
        std::uint32_t playerHpLeft,
        std::uint32_t playerHpRight,
        const std::uint32_t *seeds,
        std::uint32_t seedCount,
        std::uint32_t lowStart,
        std::uint32_t lowCount);
    std::uint32_t gen3ngcseed_search_colo(
        std::uint32_t partyLead,
        std::uint32_t trainer,
        const std::uint32_t *seeds,
        std::uint32_t seedCount,
        std::uint32_t lowStart,
        std::uint32_t lowCount);
    std::uint32_t gen3ngcseed_search_channel(
        const std::uint32_t *patterns,
        std::uint32_t count,
        std::uint32_t startSeed,
        std::uint32_t stateCount);
    std::uintptr_t gen3ngcseed_result_ptr();
    std::uint32_t gen3ngcseed_result_count();
    std::uint32_t gen3ngcseed_last_error();
}

#endif
