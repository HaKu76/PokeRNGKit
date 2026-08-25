#include "gen4wild_bridge.h"

#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <iterator>

namespace
{
    constexpr std::uint32_t allNatures = 0x1ffffff;
    constexpr std::uint32_t allHiddenPowers = 0xffff;
    constexpr std::uint32_t allSlots = 0xfff;

    Gen4WildPackedSlot slot(std::uint32_t species, std::uint32_t level,
                            std::array<std::uint32_t, 6> stats,
                            std::array<std::uint32_t, 2> types, std::uint32_t genderRatio,
                            std::array<std::uint32_t, 3> items,
                            std::array<std::uint32_t, 3> abilities)
    {
        Gen4WildPackedSlot value = {};
        value.species = species;
        value.minLevel = level;
        value.maxLevel = level;
        std::copy(stats.begin(), stats.end(), value.stats);
        std::copy(types.begin(), types.end(), value.types);
        value.genderRatio = genderRatio;
        std::copy(items.begin(), items.end(), value.items);
        std::copy(abilities.begin(), abilities.end(), value.abilities);
        return value;
    }

    Gen4WildPackedRequest request(const std::array<Gen4WildPackedSlot, 12> &slots)
    {
        Gen4WildPackedRequest value = {};
        value.slots = slots.data();
        value.slotCount = slots.size();
        value.seed = 390451572;
        value.maxAdvances = 9;
        value.method = 2;
        value.lead = 255;
        value.encounter = 0;
        value.rate = 30;
        value.location = 170;
        value.tid = 12345;
        value.sid = 54321;
        value.game = 1u << 9;
        value.happiness = 50;
        value.natureMask = allNatures;
        value.hiddenPowerMask = allHiddenPowers;
        value.encounterSlotMask = allSlots;
        value.levelMin = 1;
        value.levelMax = 100;
        std::fill(std::begin(value.ivMax), std::end(value.ivMax), 31);
        return value;
    }
}

int main()
{
    assert(gen4wild_api_version() == 2);
    const std::array<Gen4WildPackedSlot, 12> slots = {
        slot(125, 39, { 65, 83, 57, 105, 95, 85 }, { 13, 13 }, 63, { 0, 322, 0 }, { 9, 9, 0 }),
        slot(419, 40, { 85, 105, 55, 115, 85, 50 }, { 11, 11 }, 127, { 0, 186, 0 }, { 33, 33, 0 }),
        slot(125, 41, { 65, 83, 57, 105, 95, 85 }, { 13, 13 }, 63, { 0, 322, 0 }, { 9, 9, 0 }),
        slot(441, 38, { 76, 65, 45, 91, 92, 42 }, { 0, 2 }, 127, { 0, 277, 0 }, { 51, 77, 0 }),
        slot(278, 38, { 40, 30, 30, 85, 55, 30 }, { 11, 2 }, 127, { 0, 0, 0 }, { 51, 51, 0 }),
        slot(81, 39, { 25, 35, 70, 45, 95, 55 }, { 13, 8 }, 255, { 0, 233, 0 }, { 42, 5, 0 }),
        slot(404, 38, { 60, 85, 49, 60, 60, 49 }, { 13, 13 }, 127, { 0, 0, 0 }, { 79, 22, 0 }),
        slot(404, 40, { 60, 85, 49, 60, 60, 49 }, { 13, 13 }, 127, { 0, 0, 0 }, { 79, 22, 0 }),
        slot(279, 40, { 60, 50, 100, 65, 85, 70 }, { 11, 2 }, 127, { 0, 0, 0 }, { 51, 51, 0 }),
        slot(82, 41, { 50, 60, 95, 70, 120, 70 }, { 13, 8 }, 255, { 0, 233, 0 }, { 42, 5, 0 }),
        slot(279, 40, { 60, 50, 100, 65, 85, 70 }, { 11, 2 }, 127, { 0, 0, 0 }, { 51, 51, 0 }),
        slot(82, 41, { 50, 60, 95, 70, 120, 70 }, { 13, 8 }, 255, { 0, 233, 0 }, { 42, 5, 0 }),
    };

    auto generatorRequest = request(slots);
    assert(gen4wild_generate(&generatorRequest) == 10);
    const auto *state = reinterpret_cast<const Gen4WildPackedState *>(gen4wild_result_ptr());
    assert(state->advances == 0);
    assert(state->battleAdvances == 50);
    assert(state->pid == 1504931347);
    assert((std::array<std::uint32_t, 6> { state->ivs[0], state->ivs[1], state->ivs[2], state->ivs[3], state->ivs[4], state->ivs[5] }
            == std::array<std::uint32_t, 6> { 27, 23, 6, 31, 22, 19 }));
    assert(state->ability == 1);
    assert(state->gender == 1);
    assert(state->level == 38);
    assert(state->nature == 22);
    assert(state->shiny == 0);
    assert(state->encounterSlot == 4);
    assert(state->species == 278);
    assert(state->hiddenPower == 6);
    assert(state->hiddenPowerStrength == 70);
    assert(state->call == 1);
    assert(state->chatot == 7);

    auto searcherRequest = request(slots);
    searcherRequest.maxAdvances = 0;
    searcherRequest.minAdvance = 0;
    searcherRequest.maxAdvance = 1000;
    searcherRequest.minDelay = 600;
    searcherRequest.maxDelay = 2000;
    std::fill(std::begin(searcherRequest.ivMin), std::end(searcherRequest.ivMin), 31);
    assert(gen4wild_search(&searcherRequest, 0, 1) == 33);

    std::fill(std::begin(searcherRequest.ivMin), std::end(searcherRequest.ivMin), 0);
    searcherRequest.perfectIvValue = 31;
    searcherRequest.perfectIvCount = 5;
    assert(gen4wild_search(&searcherRequest, 186, 1) == 33);
    const auto *perfectState = reinterpret_cast<const Gen4WildPackedSearcherState *>(gen4wild_result_ptr());
    assert(std::all_of(std::begin(perfectState->ivs), std::end(perfectState->ivs), [](std::uint32_t iv) {
        return iv == 31;
    }));
    assert(gen4wild_search(&searcherRequest, 187, 1) == 0);
    assert(gen4wild_last_error() == 1);

    generatorRequest.fixedSlot = slots.size();
    assert(gen4wild_generate(&generatorRequest) == 0);
    assert(gen4wild_last_error() == 1);
    return 0;
}
