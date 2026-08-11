#ifndef POKERNGKIT_ID3_BRIDGE_H
#define POKERNGKIT_ID3_BRIDGE_H

#include <cstdint>

enum class Id3Mode : std::uint32_t
{
    XDColo = 0,
    FRLGE = 1,
    RS = 2,
};

enum Id3FilterFlag : std::uint32_t
{
    FilterTID = 1,
    FilterSID = 2,
    FilterTSV = 4,
};

enum class Id3SearchMode : std::uint32_t
{
    SID = 0,
    PID = 1,
};

struct Id3PackedState
{
    std::uint32_t advances;
    std::uint32_t tidSID;
    std::uint32_t tsv;
};

struct Id3PackedSearchState
{
    std::uint32_t seed;
    std::uint32_t frame;
    std::uint32_t tidSID;
    std::uint32_t tsvShiny;
    std::uint32_t yearMonthDay;
    std::uint32_t hourMinute;
};

extern "C"
{
    std::uint32_t gen3id_api_version();
    std::uint32_t gen3id_generate(std::uint32_t mode, std::uint32_t input, std::uint32_t initialAdvances,
                               std::uint32_t maxAdvances, std::uint32_t filterFlags, std::uint32_t tid,
                               std::uint32_t sid, std::uint32_t tsv);
    std::uint32_t gen3id_search(std::uint32_t mode, std::uint32_t tid, std::uint32_t input);
    std::uintptr_t gen3id_result_ptr();
    std::uint32_t gen3id_result_count();
    std::uint32_t gen3id_last_error();
}

#endif
