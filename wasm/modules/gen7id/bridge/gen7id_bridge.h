#ifndef POKERNGKIT_GEN7ID_BRIDGE_H
#define POKERNGKIT_GEN7ID_BRIDGE_H

#include <cstdint>

struct Gen7IdPackedState
{
    std::uint32_t randLow;
    std::uint32_t randHigh;
    std::uint32_t tidSID;
    std::uint32_t tsvTRV;
    std::uint32_t advances;
    std::uint32_t g7tid;
    std::uint32_t clock;
    std::uint32_t reserved;
};

extern "C"
{
    std::uint32_t gen7id_api_version();
    std::uint32_t gen7id_generate(std::uint32_t seed, std::uint32_t minAdvances, std::uint32_t maxAdvances,
                                  std::uint32_t correction, std::uint32_t filterMode, std::uint32_t filterValue,
                                  std::uint32_t filterDigits,
                                  std::uint32_t tsv, std::uint32_t rand64Low, std::uint32_t rand64High,
                                  std::uint32_t randDigits);
    std::uintptr_t gen7id_result_ptr();
    std::uint32_t gen7id_result_count();
    std::uint32_t gen7id_last_error();
}

#endif
