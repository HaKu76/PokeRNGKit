#include "../bridge/pokerusfinder_bridge.h"

#include <cassert>

int main()
{
    assert(pokerusfinder_api_version() == 1);
    assert(pokerusfinder_search_gen3(0, 1, 300, 9'999'999) > 0);
    assert(pokerusfinder_last_error() == 0);
    assert(pokerusfinder_search_gen3(0, 1, 1000, 1) == 0);
    assert(pokerusfinder_last_error() == 1);
    assert(pokerusfinder_search_gen3(0x1'0000, 1, 300, 9'999'999) == 0);
    assert(pokerusfinder_last_error() == 1);
    assert(pokerusfinder_search_gen3(0x1'0000, 1, 300, 99'999) >= 0);
    assert(pokerusfinder_last_error() == 0);
    assert(pokerusfinder_search_pthgss(2000, 1, 1, 0, 0) >= 0);
    assert(pokerusfinder_last_error() == 0);
    assert(pokerusfinder_search_pthgss(1999, 1, 1, 0, 0) == 0);
    assert(pokerusfinder_last_error() == 1);
    return 0;
}
