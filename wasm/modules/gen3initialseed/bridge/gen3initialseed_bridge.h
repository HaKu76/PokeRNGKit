#ifndef POKERNGKIT_GEN3_INITIAL_SEED_BRIDGE_H
#define POKERNGKIT_GEN3_INITIAL_SEED_BRIDGE_H

#include <cstdint>

struct Gen3InitialSeedPackedState
{
    std::uint32_t initialSeed;
    std::uint32_t advances;
};

extern "C"
{
    std::uint32_t gen3initialseed_api_version();
    std::uint32_t gen3initialseed_find_rs_ids(std::uint32_t tid, std::uint32_t sid);
    std::uint32_t gen3initialseed_find_target(
        std::uint32_t targetSeed, std::uint32_t startAdvance, std::uint32_t stateCount);
    std::uintptr_t gen3initialseed_result_ptr();
    std::uint32_t gen3initialseed_result_count();
    std::uint32_t gen3initialseed_last_error();
}

#endif
