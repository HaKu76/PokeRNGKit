/*
 * PokeRNGKit Gen VIII Raids native parity fixture.
 * Derived from PokeFinder 4.3.2 RaidGenerator.
 * GPL-3.0-or-later.
 */
#include "gen8raids_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }
    std::array<std::uint32_t, 41> request()
    {
        std::array<std::uint32_t, 41> value = {};
        value[0] = 0x87654321U;
        value[1] = 0x12345678U;
        value[2] = 0;
        value[5] = 10;
        value[6] = 12345;
        value[7] = 54321;
        value[8] = 236;
        value[9] = 0;
        value[10] = 0;
        value[11] = 3;
        value[12] = 0;
        value[13] = 1;
        value[14] = 50;
        value[15] = 127;
        value[16] = 1;
        value[17] = 255;
        value[18] = 255;
        value[19] = 255;
        value[20] = 0x1ffffff;
        value[21] = 0xffff;
        value[23] = 255;
        value[25] = 255;
        for (std::size_t index = 0; index < 6; index++) value[32 + index] = 31;
        value[38] = 100;
        value[39] = 1;
        return value;
    }
}

int main()
{
    if (!check(gen8raids_api_version() == 1, "unexpected API version")) return 1;
    auto value = request();
    if (!check(gen8raids_generate(value.data()) == 10, "unexpected result count")) return 1;
    if (!check(gen8raids_processed_count() == 10, "unexpected processed count")) return 1;
    const auto *output = reinterpret_cast<const std::uint32_t *>(gen8raids_result_ptr());
    if (!check(output != nullptr && output[0] == 0, "unexpected first advance")) return 1;
    value[10] = 1;
    if (!check(gen8raids_generate(value.data()) == 10, "non-shiny generation failed")) return 1;
    value[0] = 0;
    value[1] = 0;
    if (!check(gen8raids_generate(value.data()) == 0 && gen8raids_last_error() == 1, "zero seed accepted")) return 1;
    value = request();
    value[4] = 250000000;
    if (!check(gen8raids_generate(value.data()) == 0 && gen8raids_last_error() == 2, "range limit failed")) return 1;
    return 0;
}
