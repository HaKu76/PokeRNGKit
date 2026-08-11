#include "gen3wild_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    constexpr std::uint32_t allNatures = 0x1ffffff;
    constexpr std::uint32_t allHiddenPowers = 0xffff;
    constexpr std::uint32_t allSlots = 0xfff;

    std::uint32_t hiddenPowerType(const Gen3WildPackedState &state)
    {
        return ((state.hp & 1) + 2 * (state.attack & 1) + 4 * (state.defense & 1)
                + 8 * (state.speed & 1) + 16 * (state.specialAttack & 1)
                + 32 * (state.specialDefense & 1))
            * 15 / 63;
    }

    std::uint32_t generate(const std::array<Gen3WildPackedSlot, 12> &slots,
                           std::uint32_t shiny = 0, std::uint32_t gender = 0,
                           std::uint32_t ability = 0, std::uint32_t natures = allNatures,
                           std::uint32_t powers = allHiddenPowers, std::uint32_t encounterSlots = allSlots,
                           std::uint32_t levelMin = 1, std::uint32_t levelMax = 100,
                           const std::array<std::uint32_t, 6> &ivMin = { 0, 0, 0, 0, 0, 0 },
                           const std::array<std::uint32_t, 6> &ivMax = { 31, 31, 31, 31, 31, 31 },
                           std::uint32_t maxAdvances = 9)
    {
        return gen3wild_generate(
            slots.data(), slots.size(), 477218588, 0, maxAdvances, 0, 1, 255, 0, 10,
            1, 0, 0, 0, 0, 0, 12345, 54321, shiny, gender, ability, natures, powers,
            encounterSlots, levelMin, levelMax, ivMin[0], ivMin[1], ivMin[2], ivMin[3],
            ivMin[4], ivMin[5], ivMax[0], ivMax[1], ivMax[2], ivMax[3], ivMax[4], ivMax[5]);
    }

    std::uint32_t search(const std::array<Gen3WildPackedSlot, 12> &slots,
                         std::uint32_t method = 1, std::uint32_t lead = 255,
                         std::uint32_t encounter = 0, std::uint32_t rate = 10,
                         bool bike = false, std::uint32_t item = 0)
    {
        return gen3wild_search(
            slots.data(), slots.size(), 0, 1, method, lead, encounter, rate,
            1, 0, 0, 0, bike ? 1 : 0, item, 12345, 54321, 0, 0, 0,
            allNatures, allHiddenPowers, allSlots, 1, 100,
            31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31);
    }
}

int main()
{
    assert(gen3wild_api_version() == 3);
    const std::array<Gen3WildPackedSlot, 12> slots = {
        Gen3WildPackedSlot { 27, 0, 20, 20, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 328, 0, 20, 20, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 27, 0, 21, 21, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 328, 0, 21, 21, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 343, 0, 19, 19, 255, 4 | (13 << 8) },
        Gen3WildPackedSlot { 343, 0, 21, 21, 255, 4 | (13 << 8) },
        Gen3WildPackedSlot { 27, 0, 19, 19, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 328, 0, 19, 19, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 343, 0, 20, 20, 255, 4 | (13 << 8) },
        Gen3WildPackedSlot { 331, 0, 20, 20, 127, 11 | (11 << 8) },
        Gen3WildPackedSlot { 331, 0, 22, 22, 127, 11 | (11 << 8) },
        Gen3WildPackedSlot { 331, 0, 22, 22, 127, 11 | (11 << 8) },
    };

    assert(generate(slots) == 10);
    const auto *state = reinterpret_cast<const Gen3WildPackedState *>(gen3wild_result_ptr());
    assert(state->advances == 0);
    assert(state->pid == 1012584442);
    assert(state->encounterSlot == 3);
    assert(state->species == 328);
    assert(state->level == 21);
    assert(state->hp == 12);
    assert(state->attack == 31);
    assert(state->defense == 4);
    assert(state->specialAttack == 27);
    assert(state->specialDefense == 8);
    assert(state->speed == 20);
    assert((state->natureShiny & 0xff) == 17);

    assert(generate(slots, 0, 0, 0, 1u << 17, 1u << hiddenPowerType(*state), 1u << 3,
                    21, 21, { 12, 31, 4, 27, 8, 20 }, { 12, 31, 4, 27, 8, 20 })
           == 1);
    state = reinterpret_cast<const Gen3WildPackedState *>(gen3wild_result_ptr());
    assert(state->advances == 0);

    assert(generate(slots, 0, 0, 0, allNatures, allHiddenPowers, 0) == 0);
    assert(gen3wild_last_error() == 1);
    assert(generate(slots, 0, 0, 0, allNatures, allHiddenPowers, allSlots, 1, 100,
                    { 0, 0, 0, 0, 0, 0 }, { 31, 31, 31, 31, 31, 31 }, 100000)
           == 0);
    assert(gen3wild_last_error() == 1);

    assert(search(slots) == 20);
    state = reinterpret_cast<const Gen3WildPackedState *>(gen3wild_result_ptr());
    assert(state->hp == 31);
    assert(state->attack == 31);
    assert(state->defense == 31);
    assert(state->specialAttack == 31);
    assert(state->specialDefense == 31);
    assert(state->speed == 31);
    assert(gen3wild_generate(
               slots.data(), slots.size(), state->advances, 0, 0, 0, 1, 255, 0, 10,
               1, 0, 0, 0, 0, 0, 12345, 54321, 0, 0, 0, allNatures,
               allHiddenPowers, allSlots, 1, 100, 31, 31, 31, 31, 31, 31,
               31, 31, 31, 31, 31, 31)
           == 1);
    assert(search(slots, 2, 0) == 54);
    assert(search(slots, 4, 25) == 4);
    return 0;
}
