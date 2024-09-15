using LinearAlgebra
using Statistics

# --------------------------------------------------------------------------------------

function cosine_similarity_matrix(preferences::Matrix)
    m, n = size(preferences)
    Σ = zeros(Float64, m, m)
    for i in 1:m
        for j in 1:m
            if i != j
                Σ[i, j] = dot(preferences[i, :], preferences[j, :]) / (norm(preferences[i, :]) * norm(preferences[j, :]))
            end
        end
    end
    return Σ
end

function penalty_function(S::Matrix, λ::Float64, α::Float64, W::Vector)
    m = length(W)
    W′ = copy(W)
    for i in 1:m
        penalty_sum = 0.0
        for j in 1:m
            if i != j
                similarity = S[i, j]
                penalty_sum += exp(α * similarity) - 1
            end
        end
        avg_similarity_penalty = penalty_sum / (m - 1)
        adjustment = λ * avg_similarity_penalty
        W′[i] = W[i] * (1 - adjustment)

        if W′[i] < 0.01
            W′[i] = 0.01
        end
    end
    return W′
end

# Example usage
preferences = [
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    20 10 10;
    400 200 200;
    20 8  10;
    10 20 10;
    10 10 20;
    10 20 10;
    0  0  1000
]

W = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]

Σ = cosine_similarity_matrix(preferences)

λ = 0.1
α = 1.5

W′ = penalty_function(Σ, λ, α, W)
