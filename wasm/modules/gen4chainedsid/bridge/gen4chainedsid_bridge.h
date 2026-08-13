#ifndef POKERNGKIT_GEN4_CHAINED_SID_BRIDGE_H
#define POKERNGKIT_GEN4_CHAINED_SID_BRIDGE_H

#include <cstdint>

struct Gen4ChainedSidPackedEntry
{
    std::uint32_t hp;
    std::uint32_t atk;
    std::uint32_t def;
    std::uint32_t spa;
    std::uint32_t spd;
    std::uint32_t spe;
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t nature;
    std::uint32_t ability0;
    std::uint32_t ability1;
    std::uint32_t genderRatio;
};

extern "C"
{
    std::uint32_t gen4chainedsid_api_version();
    std::uint32_t gen4chainedsid_calculate(std::uint32_t tid, const Gen4ChainedSidPackedEntry *entries,
                                           std::uint32_t entryCount);
    std::uintptr_t gen4chainedsid_result_ptr();
    std::uint32_t gen4chainedsid_result_count();
    std::uint32_t gen4chainedsid_last_error();
}

#endif
