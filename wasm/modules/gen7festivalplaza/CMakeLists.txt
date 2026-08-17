if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7FestivalPlazaNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_FESTIVAL_PLAZA_SOURCES bridge/gen7festivalplaza_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7festivalplaza ${GEN7_FESTIVAL_PLAZA_SOURCES})
    target_include_directories(gen7festivalplaza PRIVATE bridge)
    target_compile_options(gen7festivalplaza PRIVATE "-O3")
    target_link_options(
        gen7festivalplaza
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7FestivalPlazaModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7festivalplaza_api_version','_gen7festivalplaza_begin','_gen7festivalplaza_step','_gen7festivalplaza_result_ptr','_gen7festivalplaza_result_count','_gen7festivalplaza_step_processed','_gen7festivalplaza_total_processed','_gen7festivalplaza_total_results','_gen7festivalplaza_done','_gen7festivalplaza_limit_reached','_gen7festivalplaza_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7festivalplaza
        PROPERTIES
        OUTPUT_NAME "gen7festivalplaza"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen7festivalplaza_native_test
        ${GEN7_FESTIVAL_PLAZA_SOURCES}
        tests/gen7festivalplaza_native_test.cpp
    )
    target_include_directories(gen7festivalplaza_native_test PRIVATE bridge)
    add_test(NAME gen7festivalplaza_native_session COMMAND gen7festivalplaza_native_test)
endif()
