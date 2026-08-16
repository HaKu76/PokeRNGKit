if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7EggSeedFinderNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_EGG_SEED_FINDER_SOURCES bridge/gen7eggseedfinder_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7eggseedfinder ${GEN7_EGG_SEED_FINDER_SOURCES})
    target_include_directories(gen7eggseedfinder PRIVATE bridge)
    target_compile_options(gen7eggseedfinder PRIVATE "-O3" "-msimd128")
    set_target_properties(
        gen7eggseedfinder
        PROPERTIES
        OUTPUT_NAME "gen7eggseedfinder"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
    target_link_options(
        gen7eggseedfinder
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sENVIRONMENT=web,worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7eggseedfinder_api_version','_gen7eggseedfinder_search','_gen7eggseedfinder_result_ptr','_gen7eggseedfinder_result_count','_gen7eggseedfinder_magikarp','_gen7eggseedfinder_magikarp_result_ptr','_gen7eggseedfinder_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU32']"
    )
elseif(BUILD_TESTING)
    add_executable(gen7eggseedfinder_native_test ${GEN7_EGG_SEED_FINDER_SOURCES} tests/gen7eggseedfinder_native_test.cpp)
    target_include_directories(gen7eggseedfinder_native_test PRIVATE bridge)
    add_test(NAME gen7eggseedfinder_native_parity COMMAND gen7eggseedfinder_native_test)
endif()
