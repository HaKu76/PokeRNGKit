#include "gen4event_bridge.h"

#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstdlib>

#undef assert
#define assert(condition)                                                                            \
    do                                                                                               \
    {                                                                                                \
        if (!(condition))                                                                            \
        {                                                                                            \
            std::fprintf(stderr, "Assertion failed: %s (%s:%d)\n", #condition, __FILE__, __LINE__); \
            std::exit(EXIT_FAILURE);                                                                 \
        }                                                                                            \
    } while (false)

namespace
{
    constexpr std::uint32_t allHiddenPowers = 0xffff;

    std::uint32_t generate(std::uint32_t seed, std::uint32_t initialAdvances,
                           std::uint32_t maxAdvances, std::uint32_t offset)
    {
        return gen4event_generate(seed, initialAdvances, maxAdvances, offset, 1, 0, 1,
                                  allHiddenPowers, 0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31);
    }
}

int main()
{
    assert(gen4event_api_version() == 1);

    assert(generate(0, 0, 0, 0) == 1);
    assert(gen4event_result_count() == 1);
    const auto *state = reinterpret_cast<const Gen4EventPackedState *>(gen4event_result_ptr());
    assert(state->advances == 0);
    assert(state->hp == 0);
    assert(state->attack == 0);
    assert(state->defense == 0);
    assert(state->specialAttack == 11);
    assert(state->specialDefense == 26);
    assert(state->speed == 30);
    assert(state->hiddenPower == 3);
    assert(state->hiddenPowerStrength == 65);
    assert(state->call == 0);
    assert(state->chatot == 0);

    assert(gen4event_generate(0, 0, 0, 0, 0, 0, 1, allHiddenPowers,
                              0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31) == 0);
    assert(gen4event_last_error() == 1);

    assert(gen4event_search(0, 1, 0, 1000, 600, 2000, 1, 0, 1, allHiddenPowers,
                            0, 0, 0, 11, 26, 30, 0, 0, 0, 11, 26, 30) > 0);
    assert(gen4event_result_count() > 0);
    const auto *searchState
        = reinterpret_cast<const Gen4EventPackedSearcherState *>(gen4event_result_ptr());
    assert(searchState->hour < 24);
    assert(searchState->delay >= 600);
    assert(searchState->delay <= 2000);
    assert(searchState->hp == 0);
    assert(searchState->attack == 0);
    assert(searchState->defense == 0);
    assert(searchState->specialAttack == 11);
    assert(searchState->specialDefense == 26);
    assert(searchState->speed == 30);
    return 0;
}
