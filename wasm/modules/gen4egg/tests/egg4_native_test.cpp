#include "gen4egg_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    std::array<std::uint32_t, 50> request(std::uint32_t game, bool masuda)
    {
        std::array<std::uint32_t, 50> value {};
        value[0] = game;
        value[3] = 0;
        value[4] = 9;
        value[6] = 0;
        value[7] = 9;
        value[9] = 1;
        value[10] = 31;
        value[11] = 31;
        value[12] = 12345;
        value[13] = 54321;
        value[14] = masuda;
        value[18] = 0x1ffffff;
        value[19] = 0xffff;
        for (std::size_t index = 0; index < 6; index++)
        {
            value[20 + index] = 0;
            value[26 + index] = 31;
            value[32 + index] = 31;
            value[38 + index] = 31;
        }
        value[44] = 0;
        value[45] = 1;
        value[48] = 31;
        value[49] = 0;
        return value;
    }

    void checkDiamond()
    {
        const auto value = request(0, false);
        assert(gen4egg_generate(value.data(), value.size(), 0, 9) == 100);
        assert(gen4egg_last_error() == 0);
        const auto *states = reinterpret_cast<const Gen4EggPackedState *>(gen4egg_result_ptr());
        const auto &state = states[0];
        assert(state.advances == 0 && state.pickupAdvances == 0);
        assert(state.pid == 2357136044u && state.ability == 0 && state.gender == 0);
        assert(state.nature == 19 && state.shiny == 0);
        assert(state.hp == 0 && state.attack == 31 && state.defense == 0);
        assert(state.specialAttack == 31 && state.specialDefense == 26 && state.speed == 31);
        assert(state.inheritanceHp == 0 && state.inheritanceAttack == 2 && state.inheritanceDefense == 0);
        assert(state.inheritanceSpecialAttack == 2 && state.inheritanceSpecialDefense == 0 && state.inheritanceSpeed == 1);
        assert(state.hiddenPower == 6 && state.hiddenPowerStrength == 66);
        assert(state.call == 0 && state.chatot == 0);
    }

    void checkMasuda()
    {
        const auto value = request(0, true);
        assert(gen4egg_generate(value.data(), value.size(), 0, 9) == 100);
        const auto *states = reinterpret_cast<const Gen4EggPackedState *>(gen4egg_result_ptr());
        assert(states[0].pid == 2745925320u);
        assert(states[0].nature == 20);
    }

    void checkHgss()
    {
        const auto value = request(1, false);
        assert(gen4egg_generate(value.data(), value.size(), 0, 9) == 100);
        const auto *states = reinterpret_cast<const Gen4EggPackedState *>(gen4egg_result_ptr());
        const auto &state = states[0];
        assert(state.hp == 31 && state.attack == 0 && state.defense == 0);
        assert(state.specialAttack == 31 && state.specialDefense == 26 && state.speed == 31);
        assert(state.inheritanceHp == 2 && state.inheritanceAttack == 0 && state.inheritanceDefense == 0);
        assert(state.inheritanceSpecialAttack == 2 && state.inheritanceSpecialDefense == 0 && state.inheritanceSpeed == 1);
        assert(state.hiddenPower == 5 && state.hiddenPowerStrength == 66);
    }

    void checkSearcher()
    {
        auto value = request(0, false);
        value[46] = 0;
        value[47] = 0;
        assert(gen4egg_search(value.data(), value.size(), 0, 1) == 100);
        assert(gen4egg_last_error() == 0);
        const auto *states = reinterpret_cast<const Gen4EggPackedSearcherState *>(gen4egg_result_ptr());
        assert(states[0].seed == 0 && states[0].delay == 0);
        assert(states[0].state.pid == 2357136044u);
    }

    void checkSearcherDelayCarry()
    {
        auto value = request(0, false);
        value[46] = 0x10000;
        value[47] = 0x10000;
        assert(gen4egg_search(value.data(), value.size(), 0, 1) == 100);
        assert(gen4egg_last_error() == 0);
        const auto *states = reinterpret_cast<const Gen4EggPackedSearcherState *>(gen4egg_result_ptr());
        assert(states[0].seed == 0x10000 && states[0].delay == 0);
    }
}

int main()
{
    static_assert(sizeof(Gen4EggPackedState) == 23 * sizeof(std::uint32_t));
    static_assert(sizeof(Gen4EggPackedSearcherState) == 25 * sizeof(std::uint32_t));
    assert(gen4egg_api_version() == 2);
    checkDiamond();
    checkMasuda();
    checkHgss();
    checkSearcher();
    checkSearcherDelayCarry();
    return 0;
}
