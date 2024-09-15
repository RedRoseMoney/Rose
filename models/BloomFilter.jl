using Random

struct BloomFilter
    bit_array::BitVector
    num_hashes::Int
    size::Int

    function BloomFilter(num_elements::Int, false_positive_rate::Float64)
        # Compute optimal size of the bit array (m)
        m = ceil(Int, -(num_elements * log(false_positive_rate)) / (log(2)^2))
        # Compute the optimal number of hash functions (k)
        k = round(Int, (m / num_elements) * log(2))
        
        new(BitVector(zeros(m)), k, m)
    end
end

function hash_element(element::String, seed::Int)
    return abs(hash(element * string(seed)))
end

function insert!(filter::BloomFilter, element::String)
    for i in 1:filter.num_hashes
        position = hash_element(element, i) % filter.size + 1
        filter.bit_array[position] = true
    end
end

function contains(filter::BloomFilter, element::String)::Bool
    for i in 1:filter.num_hashes
        position = hash_element(element, i) % filter.size + 1
        if !filter.bit_array[position]
            return false
        end
    end
    return true
end

# Example Usage
num_elements = 1_000
false_positive_rate = 0.1
bloom_filter = BloomFilter(num_elements, false_positive_rate)

# Insert some elements
insert!(bloom_filter, "apple")
insert!(bloom_filter, "banana")
insert!(bloom_filter, "cherry")
insert!(bloom_filter, "grape")
insert!(bloom_filter, "orange")
insert!(bloom_filter, "pear")
insert!(bloom_filter, "peach")
insert!(bloom_filter, "plum")
insert!(bloom_filter, "pineapple")
insert!(bloom_filter, "papaya")
insert!(bloom_filter, "passion fruit")
insert!(bloom_filter, "pomegranate")
insert!(bloom_filter, "pomelo")
insert!(bloom_filter, "prune")
insert!(bloom_filter, "quince")
insert!(bloom_filter, "raspberry")
insert!(bloom_filter, "redcurrant")
insert!(bloom_filter, "rhubarb")
insert!(bloom_filter, "mangosteen")
insert!(bloom_filter, "rockmelon")
insert!(bloom_filter, "soursop")
insert!(bloom_filter, "star fruit")
insert!(bloom_filter, "tangerine")
insert!(bloom_filter, "ugli")
insert!(bloom_filter, "vanilla")
insert!(bloom_filter, "watermelon")
insert!(bloom_filter, "xigua")
insert!(bloom_filter, "yellowfruit")
insert!(bloom_filter, "zucchini")
insert!(bloom_filter, "acai")
insert!(bloom_filter, "apricot")
insert!(bloom_filter, "avocado")
insert!(bloom_filter, "blackberry")
insert!(bloom_filter, "blackcurrant")
insert!(bloom_filter, "blueberry")
insert!(bloom_filter, "boysenberry")
insert!(bloom_filter, "cantaloupe")
insert!(bloom_filter, "cherimoya")
insert!(bloom_filter, "clementine")
insert!(bloom_filter, "coconut")
insert!(bloom_filter, "cranberry")
insert!(bloom_filter, "custard apple")
insert!(bloom_filter, "date")
insert!(bloom_filter, "dragonfruit")
insert!(bloom_filter, "durian")
insert!(bloom_filter, "elderberry")
insert!(bloom_filter, "feijoa")
insert!(bloom_filter, "fig")
insert!(bloom_filter, "goji berry")
insert!(bloom_filter, "gooseberry")
insert!(bloom_filter, "grapefruit")
insert!(bloom_filter, "guava")
insert!(bloom_filter, "honeydew")
insert!(bloom_filter, "jackfruit")
insert!(bloom_filter, "jambul")
insert!(bloom_filter, "jujube")
insert!(bloom_filter, "kiwi")
insert!(bloom_filter, "kumquat")
insert!(bloom_filter, "lemon")
insert!(bloom_filter, "lime")
insert!(bloom_filter, "loquat")
insert!(bloom_filter, "longan")
insert!(bloom_filter, "lychee")
insert!(bloom_filter, "mandarin")
insert!(bloom_filter, "mango")
insert!(bloom_filter, "mangosteen")
insert!(bloom_filter, "marionberry")
insert!(bloom_filter, "melon")
insert!(bloom_filter, "miracle fruit")
insert!(bloom_filter, "mulberry")
insert!(bloom_filter, "nance")
insert!(bloom_filter, "nectarine")
insert!(bloom_filter, "olive")
insert!(bloom_filter, "papaya")
insert!(bloom_filter, "passionfruit")
insert!(bloom_filter, "peach")
insert!(bloom_filter, "pear")
insert!(bloom_filter, "persimmon")
insert!(bloom_filter, "plantain")
insert!(bloom_filter, "plum")
insert!(bloom_filter, "pineapple")
insert!(bloom_filter, "pitaya")
insert!(bloom_filter, "pitanga")
insert!(bloom_filter, "pomegranate")
insert!(bloom_filter, "prickly pear")
insert!(bloom_filter, "quince")
insert!(bloom_filter, "rambutan")
insert!(bloom_filter, "raspberry")
insert!(bloom_filter, "redcurrant")
insert!(bloom_filter, "salak")
insert!(bloom_filter, "satsuma")
insert!(bloom_filter, "soursop")
insert!(bloom_filter, "starfruit")
insert!(bloom_filter, "strawberry")
insert!(bloom_filter, "tamarillo")
insert!(bloom_filter, "tamarind")
insert!(bloom_filter, "tangelo")
insert!(bloom_filter, "tangerine")
insert!(bloom_filter, "ugli fruit")
insert!(bloom_filter, "vanilla")
insert!(bloom_filter, "watermelon")
insert!(bloom_filter, "xigua")


# Check membership
fruit_membership = [contains(bloom_filter, "apple"),
contains(bloom_filter, "banana"),
contains(bloom_filter, "cherry"),
contains(bloom_filter, "grape"),
contains(bloom_filter, "orange"),
contains(bloom_filter, "pear"),
contains(bloom_filter, "peach"),
contains(bloom_filter, "plum"),
contains(bloom_filter, "pineapple"),
contains(bloom_filter, "papaya"),
contains(bloom_filter, "passion fruit"),
contains(bloom_filter, "pomegranate"),
contains(bloom_filter, "pomelo"),
contains(bloom_filter, "prune"),
contains(bloom_filter, "quince"),
contains(bloom_filter, "raspberry"),
contains(bloom_filter, "redcurrant"),
contains(bloom_filter, "rhubarb"),
contains(bloom_filter, "mangosteen"),
contains(bloom_filter, "rockmelon"),
contains(bloom_filter, "soursop"),
contains(bloom_filter, "star fruit"),
contains(bloom_filter, "tangerine"),
contains(bloom_filter, "ugli"),
contains(bloom_filter, "vanilla"),
contains(bloom_filter, "watermelon"),
contains(bloom_filter, "xigua"),
contains(bloom_filter, "yellowfruit"),
contains(bloom_filter, "zucchini"),
contains(bloom_filter, "acai"),
contains(bloom_filter, "apricot"),
contains(bloom_filter, "avocado"),
contains(bloom_filter, "blackberry"),
contains(bloom_filter, "blackcurrant"),
contains(bloom_filter, "blueberry"),
contains(bloom_filter, "boysenberry"),
contains(bloom_filter, "cantaloupe"),
contains(bloom_filter, "cherimoya"),
contains(bloom_filter, "clementine"),
contains(bloom_filter, "coconut"),
contains(bloom_filter, "cranberry"),
contains(bloom_filter, "custard apple"),
contains(bloom_filter, "date"),
contains(bloom_filter, "dragonfruit"),
contains(bloom_filter, "durian"),
contains(bloom_filter, "elderberry"),
contains(bloom_filter, "feijoa"),
contains(bloom_filter, "fig"),
contains(bloom_filter, "goji berry"),
contains(bloom_filter, "gooseberry"),
contains(bloom_filter, "grapefruit"),
contains(bloom_filter, "guava"),
contains(bloom_filter, "honeydew"),
contains(bloom_filter, "jackfruit"),
contains(bloom_filter, "jambul"),
contains(bloom_filter, "jujube"),
contains(bloom_filter, "kiwi"),
contains(bloom_filter, "kumquat"),
contains(bloom_filter, "lemon")]

number_membership = count((x -> contains(bloom_filter, string(x))).(1:10000))
