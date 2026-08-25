#include "gen8wild_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    constexpr std::size_t requestWords = 50;
    constexpr std::size_t resultWords = 12;

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    std::array<std::uint32_t, requestWords> request()
    {
        std::array<std::uint32_t, requestWords> value = {};
        value[0] = 0x87654321;
        value[1] = 0x12345678;
        value[2] = 0x12345678;
        value[3] = 0x87654321;
        value[6] = 10;
        value[7] = 12345;
        value[8] = 54321;
        value[10] = 0;
        value[11] = 170;
        value[18] = 255;
        value[21] = 255;
        value[22] = 255;
        value[23] = 255;
        value[24] = 0x1ffffff;
        value[25] = 0xffff;
        value[26] = 0xfff;
        value[27] = 1;
        value[28] = 100;
        value[30] = 255;
        value[32] = 255;
        for (std::size_t index = 0; index < 6; index++) value[39 + index] = 31;
        value[45] = 31;
        value[46] = 0;
        value[47] = 0;
        value[48] = 100000;
        return value;
    }

    bool checkFirstWild(const std::uint32_t *output)
    {
        const std::uint32_t encounter = output[3];
        const std::uint32_t metadata = output[4];
        const std::uint32_t measures = output[11];
        return check(output[0] == 0, "wild advances mismatch")
            && check(output[1] == 4201972612U, "wild EC mismatch")
            && check(output[2] == 1485739543U, "wild PID mismatch")
            && check((encounter >> 16) == 278, "wild species mismatch")
            && check((encounter & 0xffff) == 0, "wild item mismatch")
            && check((metadata & 0x7f) == 41, "wild level mismatch")
            && check(((metadata >> 7) & 3) == 1, "wild ability mismatch")
            && check(((metadata >> 9) & 3) == 0, "wild gender mismatch")
            && check(((metadata >> 11) & 31) == 16, "wild nature mismatch")
            && check(((metadata >> 18) & 15) == 5, "wild slot mismatch")
            && check(output[5] == 0x13181012U && output[6] == 0x00001002U, "wild IV mismatch")
            && check(output[7] == 93, "wild ability index mismatch")
            && check(output[8] == 0x0024005bU && output[9] == 0x003e0023U && output[10] == 0x0051001eU,
                     "wild stats mismatch")
            && check((measures & 0xff) == 72 && ((measures >> 8) & 0xff) == 97, "wild size mismatch")
            && check(((measures >> 16) & 31) == 14 && ((measures >> 21) & 15) == 3,
                     "wild characteristic mismatch");
    }

    bool checkFirstHoney(const std::uint32_t *output)
    {
        const std::uint32_t encounter = output[3];
        const std::uint32_t metadata = output[4];
        return check(output[0] == 0, "honey advances mismatch")
            && check(output[1] == 4201972612U && output[2] == 1485739543U, "honey RNG mismatch")
            && check((encounter >> 16) == 265 && (encounter & 0xffff) == 151, "honey encounter mismatch")
            && check((metadata & 0x7f) == 14 && ((metadata >> 18) & 15) == 0, "honey metadata mismatch")
            && check(output[7] == 19, "honey ability index mismatch")
            && check(output[8] == 0x00130027U && output[9] == 0x000e0010U && output[10] == 0x000c000dU,
                     "honey stats mismatch");
    }

    struct Fixture
    {
        const char *name;
        std::uint32_t encounter;
        std::uint32_t location;
        std::uint32_t lead;
        std::uint32_t feebasTile;
        std::uint32_t honeyIndex;
        std::array<std::uint32_t, resultWords> expected;
    };

    bool checkFixture(const Fixture &fixture)
    {
        auto value = request();
        value[10] = fixture.encounter;
        value[11] = fixture.location;
        value[17] = fixture.feebasTile;
        value[18] = fixture.lead;
        value[19] = fixture.honeyIndex;
        value[26] = fixture.encounter == 1 ? 1 : 0xfff;
        if (!check(gen8wild_generate(value.data()) == 10, fixture.name)) return false;
        if (!check(gen8wild_processed_count() == 10, "fixture processed count mismatch")) return false;
        const auto *output = reinterpret_cast<const std::uint32_t *>(gen8wild_result_ptr());
        for (std::size_t index = 0; index < resultWords; index++)
        {
            if (output[index] != fixture.expected[index])
            {
                std::cerr << fixture.name << " result word mismatch at " << index << '\n';
                return false;
            }
        }
        return true;
    }
}

int main()
{
    if (!check(gen8wild_api_version() == 2, "unexpected API version")) return 1;

    auto value = request();
    if (!check(gen8wild_generate(value.data()) == 10, "wild result count mismatch")) return 1;
    if (!check(gen8wild_processed_count() == 10, "wild processed count mismatch")) return 1;
    const auto *output = reinterpret_cast<const std::uint32_t *>(gen8wild_result_ptr());
    if (!checkFirstWild(output)) return 1;

    value = request();
    value[10] = 1;
    value[11] = 145;
    value[26] = 1;
    if (!check(gen8wild_generate(value.data()) == 10, "honey result count mismatch")) return 1;
    output = reinterpret_cast<const std::uint32_t *>(gen8wild_result_ptr());
    if (!checkFirstHoney(output)) return 1;

    constexpr std::array<Fixture, 18> fixtures = {
        Fixture { "Route 222 Grass Compound Eyes", 0, 170, 34, 0, 0,
                  { 0x0U, 0xFA750384U, 0x588E9617U, 0x1160000U, 0x1480A9U, 0x13181012U, 0x1002U, 0x5DU,
                    0x24005BU, 0x3E0023U, 0x51001EU, 0x6E6148U } },
        Fixture { "Route 222 Grass Cute Charm", 0, 170, 25, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1160000U, 0x148029U, 0x2131810U, 0x710U, 0x33U,
                    0x27005AU, 0x370021U, 0x4D0024U, 0x496148U } },
        Fixture { "Route 214 Grass Flash Fire", 0, 163, 30, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x4D0000U, 0x89817U, 0x2131810U, 0x710U, 0x32U,
                    0x31003BU, 0x260022U, 0x300022U, 0x49BE64U } },
        Fixture { "Route 221 Grass Harvest", 0, 169, 29, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x13B0000U, 0x8981DU, 0x2131810U, 0x710U, 0x1EU,
                    0x2E0048U, 0x450024U, 0x2C0032U, 0x49BE64U } },
        Fixture { "Route 206 Grass Magnet Pull", 0, 147, 27, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1B40000U, 0x18840FU, 0x2131810U, 0x710U, 0x1AU,
                    0xF002CU, 0xD001DU, 0xC0021U, 0x496148U } },
        Fixture { "Route 222 Grass Pressure", 0, 170, 32, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1160000U, 0x149829U, 0x2131810U, 0x710U, 0x33U,
                    0x27005AU, 0x370025U, 0x4D0020U, 0x49BE64U } },
        Fixture { "Fuego Ironworks Grass Static", 0, 9, 28, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1A10000U, 0x18981DU, 0x2131810U, 0x710U, 0x32U,
                    0x26004EU, 0x220033U, 0x3E0036U, 0x49BE64U } },
        Fixture { "Route 222 Grass Storm Drain", 0, 170, 31, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1A70000U, 0x49828U, 0x2131810U, 0x710U, 0x3CU,
                    0x510091U, 0x560043U, 0x270045U, 0x49BE64U } },
        Fixture { "Route 222 Grass Synchronize", 0, 170, 0, 0, 0,
                  { 0x0U, 0xFA750384U, 0x588E9617U, 0x1160000U, 0x1400A9U, 0x13181012U, 0x1002U, 0x5DU,
                    0x24005BU, 0x390027U, 0x51001EU, 0x6E6465U } },
        Fixture { "Route 222 Surfing", 3, 170, 255, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1160000U, 0x49816U, 0x2131810U, 0x710U, 0x33U,
                    0x170035U, 0x1F0016U, 0x2B0012U, 0x49BE64U } },
        Fixture { "Route 222 Old Rod", 4, 170, 255, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x810000U, 0x49805U, 0x2131810U, 0x710U, 0x21U,
                    0x70011U, 0x6000BU, 0xD0006U, 0x49BE64U } },
        Fixture { "Route 222 Good Rod", 5, 170, 255, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0xDF0000U, 0x49813U, 0x2131810U, 0x710U, 0x37U,
                    0x22002DU, 0x210015U, 0x1F0012U, 0x49BE64U } },
        Fixture { "Route 222 Super Rod", 6, 170, 255, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0xE00000U, 0x49820U, 0x2131810U, 0x710U, 0x15U,
                    0x4F005FU, 0x4F003BU, 0x240034U, 0x49BE64U } },
        Fixture { "Mt Coronet Feebas", 6, 22, 255, 1, 0,
                  { 0x0U, 0x588E9617U, 0x8196E3F0U, 0x1540000U, 0x41A24U, 0x10021318U, 0x1C07U, 0xCU,
                    0x4A0085U, 0x3A003AU, 0x3A003AU, 0x1127261U } },
        Fixture { "Solaceon Ruins Unown", 0, 30, 255, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0xC90000U, 0x948416U, 0x2131810U, 0x710U, 0x1AU,
                    0x290038U, 0x28001BU, 0x1B001DU, 0x496148U } },
        Fixture { "Route 205 Honey Tree Compound Eyes", 1, 145, 34, 0, 0,
                  { 0x0U, 0xFA750384U, 0x588E9617U, 0x1090097U, 0x808EU, 0x13181012U, 0x1002U, 0x13U,
                    0x130027U, 0xE0010U, 0xC000DU, 0x6E6148U } },
        Fixture { "Route 205 Honey Tree Cute Charm", 1, 145, 25, 0, 0,
                  { 0x0U, 0x7B11ECE6U, 0x532DB332U, 0x1090097U, 0x800EU, 0x2131810U, 0x710U, 0x13U,
                    0x140026U, 0xB000FU, 0xB000FU, 0x496148U } },
        Fixture { "Route 205 Honey Tree Synchronize", 1, 145, 0, 0, 0,
                  { 0x0U, 0xFA750384U, 0x588E9617U, 0x1090097U, 0x8EU, 0x13181012U, 0x1002U, 0x13U,
                    0x130027U, 0xD0012U, 0xC000DU, 0x6E6465U } },
    };
    for (const auto &fixture : fixtures)
        if (!checkFixture(fixture)) return 1;

    auto invalid = request();
    invalid[0] = invalid[1] = invalid[2] = invalid[3] = 0;
    if (!check(gen8wild_generate(invalid.data()) == 0 && gen8wild_last_error() == 1, "zero seed validation failed"))
        return 1;

    value = request();
    value[48] = 1;
    if (!check(gen8wild_generate(value.data()) == 1 && gen8wild_limit_reached() == 1, "result limit failed")) return 1;

    return 0;
}
